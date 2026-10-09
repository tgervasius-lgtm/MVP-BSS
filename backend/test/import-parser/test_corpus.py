"""Synthetic format corpus. Direct parser tests do not claim sandbox proof."""
import copy
import io
import os
from pathlib import Path
import sys
import unittest
import zipfile
import struct
import zlib

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "import-parser"))
from archive import Rejected, MAX_ENTRY
from worker import parse

HEADERS = "code,name,department,shift,annualLeaveAllowance,email"
ROW = "000001,Synthetic Worker,Office,Day,0,synthetic@example.invalid"
S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
P = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'


def parts():
    def inline(ref, value):
        return f'<c r="{ref}" t="inlineStr"><is><t>{value}</t></is></c>'
    rows = []
    for index, values in enumerate([HEADERS.split(','), ROW.split(',')], 1):
        cells = ''.join(inline(f'{chr(65+c)}{index}', v) for c, v in enumerate(values))
        rows.append(f'<row r="{index}">{cells}</row>')
    return {
        '[Content_Types].xml': f'<Types xmlns="{CT}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
        '_rels/.rels': f'<Relationships xmlns="{P}"><Relationship Id="r1" Type="{R}/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        'xl/workbook.xml': f'<workbook xmlns="{S}" xmlns:r="{R}"><sheets><sheet name="Workers" sheetId="1" r:id="r1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels': f'<Relationships xmlns="{P}"><Relationship Id="r1" Type="{R}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
        'xl/worksheets/sheet1.xml': f'<worksheet xmlns="{S}"><dimension ref="A1:F2"/><sheetData>{"".join(rows)}</sheetData></worksheet>',
    }


def workbook(values=None, compression=zipfile.ZIP_DEFLATED):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=compression) as z:
        for name, value in (values or parts()).items():
            z.writestr(name, value)
    return output.getvalue()


class Corpus(unittest.TestCase):
    def reject_csv(self, text):
        with self.assertRaises(Exception):
            parse(text.encode() if isinstance(text, str) else text, 'csv', ',')

    def reject_xlsx(self, values):
        with self.assertRaises(Exception):
            parse(workbook(values), 'xlsx', ',')

    def test_csv_lexical_and_dialects(self):
        for delimiter in (',', ';'):
            result = parse(('\ufeff' + HEADERS.replace(',', delimiter) + '\r\n' + ROW.replace(',', delimiter)).encode(), 'csv', delimiter)
            self.assertEqual(result['rows'][0][0], '000001')
            self.assertEqual(result['rows'][0][4], '0')
        text = HEADERS + '\n' + ROW.replace('Synthetic Worker', '"Synthetic, ""Worker""\nSecond line"')
        self.assertEqual(parse(text.encode(), 'csv', ',')['rows'][0][1], 'Synthetic, "Worker"\nSecond line')

    def test_csv_limits_and_invalid_encoding(self):
        for data in [b'\xff\xfeabc', b'a\x00b', b'x' * 1048577, b'',
                     HEADERS + '\n' + ROW.replace('Synthetic Worker', 'x' * 1025),
                     HEADERS + '\n' + ROW + ',extra', HEADERS + '\n' + ROW.rsplit(',', 1)[0],
                     HEADERS + '\n' + ROW + '\n\n' + ROW, HEADERS + '\n"unterminated']:
            with self.subTest(data=str(data)[:30]):
                self.reject_csv(data)

    def test_headers_rows_and_formula_like_values(self):
        for header in [HEADERS.replace('code', 'name'), HEADERS.replace('code', 'NAME'),
                       HEADERS.replace('code', ''), HEADERS.replace('code', 'x'*81), HEADERS + ',OIB']:
            self.reject_csv(header + '\n' + ROW)
        for value in ['=1+1', '\t@SUM(1)', ' +2', '-1']:
            self.reject_csv(HEADERS + '\n' + ROW.replace('Synthetic Worker', value))
        data = HEADERS + '\n' + '\n'.join([ROW] * 1000)
        self.assertEqual(len(parse(data.encode(), 'csv', ',')['rows']), 1000)
        self.reject_csv(data + '\n' + ROW)

    def test_xlsx_real_zip_and_text(self):
        for compression in [zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED]:
            result = parse(workbook(compression=compression), 'xlsx', ',')
            self.assertEqual(result['rows'][0], ROW.split(','))

    def test_xlsx_numeric_types_are_preserved_for_mapping(self):
        p = parts()
        p['xl/worksheets/sheet1.xml'] = p['xl/worksheets/sheet1.xml'].replace('<c r="A2" t="inlineStr"><is><t>000001</t></is></c>', '<c r="A2"><v>1</v></c>')
        self.assertIsInstance(parse(workbook(p), 'xlsx', ',')['rows'][0][0], int)

    def test_xlsx_unsafe_cells_and_sparse_bounds(self):
        for replacement in ['<c r="A2"><f>1+1</f><v>2</v></c>', '<c r="A2" t="e"><v>#VALUE!</v></c>',
                            '<c r="A2" t="b"><v>1</v></c>', '<c r="A2" t="d"><v>2026-10-09</v></c>',
                            '<c r="A2" t="inlineStr"><is><r><t>000001</t></r></is></c>',
                            '<c r="G2" t="inlineStr"><is><t>000001</t></is></c>',
                            '<c r="A1002"><v>1</v></c>', '<c r="A2"><v>1e2</v></c>',
                            '<c r="A2"><v>0.25</v></c>']:
            p = parts()
            p['xl/worksheets/sheet1.xml'] = p['xl/worksheets/sheet1.xml'].replace('<c r="A2" t="inlineStr"><is><t>000001</t></is></c>', replacement)
            self.reject_xlsx(p)

    def test_xlsx_hidden_rows_cols_sheets_and_extra_sheets(self):
        for file, old, new in [('xl/workbook.xml', 'sheet name=', 'sheet state="hidden" name='),
                               ('xl/worksheets/sheet1.xml', '<row r="2">', '<row r="2" hidden="1">'),
                               ('xl/worksheets/sheet1.xml', '<sheetData>', '<cols><col min="1" max="6" hidden="true"/></cols><sheetData>'),
                               ('xl/worksheets/sheet1.xml', 'A1:F2', 'A1:XFD1048576')]:
            p = parts(); p[file] = p[file].replace(old, new); self.reject_xlsx(p)
        p = parts(); p['xl/worksheets/sheet2.xml'] = p['xl/worksheets/sheet1.xml']; self.reject_xlsx(p)

    def test_duplicate_data_containers_cannot_silently_drop_rows_or_sheets(self):
        for file, closing, duplicate in [
            ('xl/workbook.xml', '</workbook>', '<sheets/>'),
            ('xl/worksheets/sheet1.xml', '</worksheet>', '<sheetData/>'),
            ('xl/worksheets/sheet1.xml', '</worksheet>', '<dimension ref="A1:F2"/>')
        ]:
            p = parts(); p[file] = p[file].replace(closing, duplicate + closing)
            with self.assertRaises(Rejected): parse(workbook(p), 'xlsx', ',')

    def test_archives_payloads_relations_and_entities(self):
        for name in ['../outside.xml', '/outside.xml', 'xl\\evil.xml', 'xl/vbaProject.bin', 'xl/embeddings/oleObject1.bin',
                     'xl/externalLinks/externalLink1.xml', 'xl/%2e%2e/secrets.xml']:
            p = parts(); p[name] = 'payload'; self.reject_xlsx(p)
        p = parts(); p['xl/_rels/workbook.xml.rels'] = p['xl/_rels/workbook.xml.rels'].replace('Target="worksheets', 'TargetMode="External" Target="https://example.invalid/worksheets'); self.reject_xlsx(p)
        for xml in ['<!DOCTYPE a [<!ENTITY x "boom">]><a>&x;</a>', '<?xml version="1.0" encoding="UTF-16"?><a/>', '<a>\x00</a>']:
            p = parts(); p['docProps/core.xml'] = xml; self.reject_xlsx(p)

    def test_archive_expansion_entry_count_crc_and_duplicate_names(self):
        p = parts(); p['docProps/core.xml'] = '<a>' + 'x' * MAX_ENTRY + '</a>'; self.reject_xlsx(p)
        p = parts(); p['docProps/core.xml'] = '<a>' + 'x' * 100000 + '</a>'; self.reject_xlsx(p)
        p = parts()
        for i in range(101): p[f'xl/theme/theme{i}.xml'] = '<a/>'
        self.reject_xlsx(p)
        data = bytearray(workbook(compression=zipfile.ZIP_STORED)); offset = data.find(b'<worksheet'); data[offset+2] ^= 1
        with self.assertRaises(Exception): parse(bytes(data), 'xlsx', ',')
        buf = io.BytesIO(workbook())
        with zipfile.ZipFile(buf, 'a') as z:
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter('ignore', UserWarning)
                z.writestr('xl/workbook.xml', parts()['xl/workbook.xml'])
        with self.assertRaises(Rejected): parse(buf.getvalue(), 'xlsx', ',')

    def test_forged_uncompressed_size_cannot_hide_extra_inflated_bytes(self):
        p = parts(); p['docProps/core.xml'] = '<a/>' + 'hidden-extra-data' * 20
        data = bytearray(workbook(p))
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            info = z.getinfo('docProps/core.xml')
        checksum = zlib.crc32(b'<a/>')
        struct.pack_into('<I', data, info.header_offset + 14, checksum)
        struct.pack_into('<I', data, info.header_offset + 22, 4)
        cursor = 0
        while True:
            cursor = data.find(b'PK\x01\x02', cursor)
            if cursor < 0: self.fail('central entry missing')
            size = struct.unpack_from('<H', data, cursor + 28)[0]
            if data[cursor+46:cursor+46+size] == b'docProps/core.xml':
                struct.pack_into('<I', data, cursor + 16, checksum)
                struct.pack_into('<I', data, cursor + 24, 4)
                break
            cursor += 4
        with self.assertRaises(Rejected): parse(bytes(data), 'xlsx', ',')


if __name__ == '__main__':
    unittest.main()
