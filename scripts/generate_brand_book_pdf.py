#!/usr/bin/env python3
"""Generira službeni BSS Brand Book v1.0 prema zaključanom Master Templateu."""

from __future__ import annotations

import json
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject,
    BooleanObject,
    DecodedStreamObject,
    DictionaryObject,
    NameObject,
    NumberObject,
    TextStringObject,
)
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab import rl_config
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp" / "pdfs"
OUTPUT = ROOT / "output" / "pdf"
RAW = TMP / "BSS_BRAND-BOOK_v1.0_raw.pdf"
FINAL = OUTPUT / "BSS_BRAND-BOOK_v1.0_11.07.2026.pdf"
DOC_DATE = "11.07.2026."
VERSION = "1.0"

FONT_ROOT = Path(
    "/opt/codex/runtimes/codex-primary-runtime/dependencies/native/"
    "libreoffice-headless/libreoffice/share/fonts/truetype"
)
FONTS = {
    "NotoSans": FONT_ROOT / "NotoSans-Regular.ttf",
    "NotoSans-Bold": FONT_ROOT / "NotoSans-Bold.ttf",
    "NotoSerif": FONT_ROOT / "NotoSerif-Regular.ttf",
    "NotoSerif-Bold": FONT_ROOT / "NotoSerif-Bold.ttf",
}

TEAL = colors.HexColor("#0F766E")
DEEP = colors.HexColor("#062A26")
SIGNAL = colors.HexColor("#14B8A6")
MINT = colors.HexColor("#ECFDF5")
SURFACE = colors.HexColor("#F8FBF9")
INK = colors.HexColor("#17352B")
MUTED = colors.HexColor("#5F796F")
LINE = colors.HexColor("#DCE8E1")
SUCCESS = colors.HexColor("#15803D")
WARNING = colors.HexColor("#B45309")
DANGER = colors.HexColor("#C62828")
INFO = colors.HexColor("#1D4ED8")


class BrandMark(Flowable):
    def __init__(self, size: float = 34 * mm, label: bool = False):
        super().__init__()
        self.size = size
        self.label = label
        self.width = size + (83 * mm if label else 0)
        self.height = size

    def draw(self):
        canvas = self.canv
        canvas.saveState()
        canvas.setFillColor(TEAL)
        canvas.roundRect(0, 0, self.size, self.size, self.size * 0.28, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("NotoSans-Bold", self.size * 0.57)
        canvas.drawCentredString(self.size / 2, self.size * 0.24, "B")
        if self.label:
            x = self.size + 8 * mm
            canvas.setFillColor(INK)
            canvas.setFont("NotoSans-Bold", 21)
            canvas.drawString(x, self.size * 0.58, "BSS")
            canvas.setFont("NotoSans", 11)
            canvas.setFillColor(MUTED)
            canvas.drawString(x, self.size * 0.34, "Bognar Smart Systems")
        canvas.restoreState()


class ColorChip(Flowable):
    def __init__(self, color, name: str, value: str, dark_text: bool = False):
        super().__init__()
        self.color = color
        self.name = name
        self.value = value
        self.dark_text = dark_text
        self.width = 52 * mm
        self.height = 31 * mm

    def draw(self):
        canvas = self.canv
        canvas.saveState()
        canvas.setFillColor(self.color)
        canvas.roundRect(0, 0, self.width, self.height, 4 * mm, fill=1, stroke=0)
        canvas.setFillColor(INK if self.dark_text else colors.white)
        canvas.setFont("NotoSans-Bold", 9)
        canvas.drawString(5 * mm, 9 * mm, self.name)
        canvas.setFont("NotoSans", 8)
        canvas.drawString(5 * mm, 5 * mm, self.value)
        canvas.restoreState()


class BSSCanvas(pdfcanvas.Canvas):
    """Canvas koji i za početni, prazni tekstualni state koristi ugrađeni font."""

    def __init__(self, *args, **kwargs):
        kwargs["initialFontName"] = "NotoSans"
        kwargs["initialFontSize"] = 12
        kwargs["initialLeading"] = 14.4
        super().__init__(*args, **kwargs)


def register_fonts() -> None:
    for name, path in FONTS.items():
        if not path.exists():
            raise FileNotFoundError(f"Nedostaje font: {path}")
        pdfmetrics.registerFont(TTFont(name, str(path), subfontIndex=0))
    rl_config.canvas_basefontname = "NotoSans"


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title", parent=base["Title"], fontName="NotoSans-Bold", fontSize=31,
            leading=34, textColor=INK, alignment=TA_LEFT, spaceAfter=8 * mm,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle", fontName="NotoSerif", fontSize=14, leading=21,
            textColor=MUTED, spaceAfter=6 * mm,
        ),
        "h1": ParagraphStyle(
            "H1", fontName="NotoSans-Bold", fontSize=23, leading=27,
            textColor=INK, spaceAfter=5 * mm,
        ),
        "h2": ParagraphStyle(
            "H2", fontName="NotoSans-Bold", fontSize=13, leading=17,
            textColor=INK, spaceBefore=4 * mm, spaceAfter=2.5 * mm,
        ),
        "body": ParagraphStyle(
            "Body", fontName="NotoSerif", fontSize=9.6, leading=15,
            textColor=INK, spaceAfter=3.2 * mm,
        ),
        "sans": ParagraphStyle(
            "Sans", fontName="NotoSans", fontSize=9.2, leading=14,
            textColor=INK, spaceAfter=3 * mm,
        ),
        "small": ParagraphStyle(
            "Small", fontName="NotoSans", fontSize=7.8, leading=11,
            textColor=MUTED, spaceAfter=2 * mm,
        ),
        "label": ParagraphStyle(
            "Label", fontName="NotoSans-Bold", fontSize=7.3, leading=10,
            textColor=TEAL, uppercase=True, spaceAfter=2 * mm,
        ),
        "quote": ParagraphStyle(
            "Quote", fontName="NotoSerif", fontSize=15, leading=21,
            textColor=DEEP, leftIndent=7 * mm, borderColor=SIGNAL,
            borderWidth=0, borderPadding=(0, 0, 0, 5 * mm), spaceAfter=5 * mm,
        ),
        "table": ParagraphStyle(
            "Table", fontName="NotoSans", fontSize=7.5, leading=10, textColor=INK,
        ),
        "table_bold": ParagraphStyle(
            "TableBold", fontName="NotoSans-Bold", fontSize=7.5, leading=10, textColor=INK,
        ),
        "toc": ParagraphStyle(
            "TOC", fontName="NotoSans", fontSize=9.2, leading=14, textColor=INK,
        ),
    }


def p(text: str, style, **kwargs):
    return Paragraph(text, style, **kwargs)


def bullet(text: str, style):
    bullet_style = ParagraphStyle(
        f"{style.name}-Bullet", parent=style, leftIndent=5 * mm,
        firstLineIndent=0, bulletIndent=0, bulletFontName="NotoSans",
        bulletFontSize=9.2, spaceAfter=2.2 * mm,
    )
    return Paragraph(text, bullet_style, bulletText="•")


def section_label(number: str, title: str, st):
    return KeepTogether([
        p(f"ODJELJAK {number}", st["label"]),
        p(title, st["h1"]),
        Spacer(1, 1.5 * mm),
    ])


def info_table(rows, widths, st, header=True):
    data = []
    for row_index, row in enumerate(rows):
        converted = []
        for cell in row:
            if isinstance(cell, Flowable):
                converted.append(cell)
            else:
                converted.append(p(str(cell), st["table_bold"] if header and row_index == 0 else st["table"]))
        data.append(converted)
    table = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1 if header else 0)
    commands = [
        ("FONTNAME", (0, 0), (-1, -1), "NotoSans"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
    ]
    if header:
        commands.extend([
            ("BACKGROUND", (0, 0), (-1, 0), SURFACE),
            ("TEXTCOLOR", (0, 0), (-1, 0), DEEP),
        ])
    table.setStyle(TableStyle(commands))
    return table


def first_page(canvas, doc):
    canvas.saveState()
    canvas.setTitle("BSS Brand Book v1.0")
    canvas.setAuthor("Bognar Smart Systems")
    canvas.setSubject("Službeni vizualni i komunikacijski identitet BSS branda")
    canvas.setCreator("BSS Master Template v1.0")
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    canvas.restoreState()


def later_page(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(MUTED)
    canvas.setFont("NotoSans", 7.2)
    canvas.drawRightString(width - 20 * mm, height - 12 * mm, DOC_DATE)
    canvas.drawRightString(width - 20 * mm, height - 16 * mm, f"Verzija {VERSION}")
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.45)
    canvas.line(20 * mm, 14 * mm, width - 20 * mm, 14 * mm)
    canvas.setFont("NotoSans", 7)
    canvas.drawCentredString(width / 2, 9 * mm, str(doc.page))
    canvas.restoreState()


def build_story(st):
    story = []

    # Naslovnica
    story += [
        Spacer(1, 19 * mm),
        BrandMark(31 * mm),
        Spacer(1, 25 * mm),
        p("Bognar Smart Systems", st["label"]),
        p("Brand Book", st["title"]),
        p("Vizualni i komunikacijski identitet za povezani SaaS + IoT sustav.", st["subtitle"]),
        Spacer(1, 70 * mm),
        p("VERZIJA 1.0", st["label"]),
        p("Od podatka na terenu do jasne odluke.", st["quote"]),
        PageBreak(),
    ]

    # Sažetak i sadržaj
    story += [
        section_label("00", "Kako koristiti ovaj dokument", st),
        p("Brand Book definira kako BSS izgleda, govori i nastupa izvan pojedinog ekrana aplikacije. BSS Design System v1.0 ostaje izvor istine za digitalne tokene i komponente; ovaj dokument pravila prenosi na web, prodaju, dokumente, uređaj i korisničke upute.", st["body"]),
        p("Brand Book ne proširuje funkcionalni opseg proizvoda.", st["h2"]),
        p("Nakon zaključavanja ove faze slijede tehnički audit i zamrzavanje opsega, a zatim BSS Refactor v1.", st["body"]),
        Spacer(1, 5 * mm),
        p("Sadržaj", st["h2"]),
        info_table([
            ["01", "Brand platforma", "Svrha, pozicija i osobnost"],
            ["02", "Naziv i poruke", "Brand promise i opis proizvoda"],
            ["03", "Znak i logotip", "Varijante, prostor i minimum"],
            ["04", "Boje", "Paleta i pravila uporabe"],
            ["05", "Tipografija", "Digitalni proizvod i dokumenti"],
            ["06", "Ton komunikacije", "Jezik i mikro-poruke"],
            ["07", "Fotografija i ilustracija", "Vizualni smjer"],
            ["08", "Terminal i hardver", "Izgled uređaja i oznake"],
            ["09", "Primjene", "Web, prodaja i materijali"],
            ["10", "Upravljanje", "Verzije, datoteke i odobrenja"],
        ], [14 * mm, 51 * mm, 100 * mm], st, header=False),
        PageBreak(),
    ]

    # Brand platforma
    story += [
        section_label("01", "Brand platforma", st),
        p("Svrha", st["h2"]),
        p("Ukloniti nesigurnost iz evidencije rada. Vrijeme, odsutnosti, odobravanja i terminalski događaji moraju biti dostupni na jednom mjestu i razumljivi svakoj ulozi.", st["body"]),
        p("Pozicija", st["h2"]),
        p("BSS je pristupačna alternativa složenim enterprise sustavima za male i srednje tvrtke: brzo uvođenje, manji ukupni trošak i jasna kontrola bez nepotrebne kompleksnosti.", st["body"]),
        p("Osobnost", st["h2"]),
        info_table([
            ["Osobina", "Što znači", "Što ne znači"],
            ["Moderno", "Čist ritam, jasni podaci i povezan uređaj", "Trendovski efekt bez funkcije"],
            ["Smireno", "Tiha sigurnost i predvidiv odgovor", "Hladno, distancirano ili bezlično"],
            ["Praktično", "Svaka poruka vodi razumijevanju ili radnji", "Jeftino ili nedorađeno"],
            ["Napredno", "Pouzdana SaaS + IoT arhitektura", "Žargon, hype ili lažno obećanje"],
        ], [33 * mm, 64 * mm, 68 * mm], st),
        Spacer(1, 7 * mm),
        p("Brand promise", st["label"]),
        p("Od podatka na terenu do jasne odluke.", st["quote"]),
        PageBreak(),
    ]

    # Naziv i pozicija
    story += [
        section_label("02", "Naziv i poruke", st),
        p("Pravilo naziva", st["h2"]),
        p("Prvo spominjanje: <b>Bognar Smart Systems (BSS)</b>. Nakon toga: <b>BSS</b>. Brand je zajednički identitet proizvoda i ne zamjenjuje puni registrirani naziv pravne osobe na ugovorima, ponudama i računima.", st["body"]),
        p("BSS se razvija iz Đakova, Hrvatska, s usmjerenjem na praktične potrebe malih i srednjih tvrtki.", st["body"]),
        p("Kategorija", st["h2"]),
        p("Povezani SaaS + IoT sustav za evidenciju radnog vremena, odsutnosti i RFID/NFC terminala.", st["body"]),
        p("Opis proizvoda", st["h2"]),
        p("BSS je povezani sustav za evidenciju radnog vremena, odsutnosti i RFID/NFC terminala za male i srednje tvrtke.", st["quote"]),
        p("Dokazi vrijednosti", st["h2"]),
        bullet("brzo uvođenje i jasno upravljanje prema ulozi;", st["sans"]),
        bullet("offline rad terminala i kontrolirana sinkronizacija;", st["sans"]),
        bullet("godišnji pregled odsutnosti, korekcije i audit trag;", st["sans"]),
        bullet("CSV/XLSX izvještaji bez lažnog obećanja obračuna plaće.", st["sans"]),
        p("Javne poruke moraju ostati unutar potvrđenih funkcionalnosti. Brand nikada ne obećava GPS, geofencing, AI analitiku, payroll ili otvaranje vrata ako te funkcije nisu dio odobrene verzije.", st["body"]),
        PageBreak(),
    ]

    # Logo
    story += [
        section_label("03", "Znak i logotip", st),
        p("Službeni v1 znak formalizira postojeći znak iz Demo 3.0: geometrijsko bijelo slovo B u zaobljenom BSS teal kvadratu.", st["body"]),
        Spacer(1, 5 * mm),
        BrandMark(28 * mm, label=True),
        Spacer(1, 9 * mm),
        info_table([
            ["Varijanta", "Datoteka", "Primjena"],
            ["Znak", "bss-symbol.svg", "Aplikacija, favicon, terminal, male površine"],
            ["Primarni lockup", "bss-logo-primary.svg", "Svijetle digitalne i tiskane podloge"],
            ["Obrnuti lockup", "bss-logo-reversed.svg", "Tamne podloge i prezentacije"],
            ["Jednobojni", "bss-logo-monochrome.svg", "Pečat, gravura i jednobojni tisak"],
        ], [36 * mm, 55 * mm, 74 * mm], st),
        p("Zaštitni prostor", st["h2"]),
        p("Najmanje ¼ širine znaka sa svake strane. U zaštitni prostor ne ulazi tekst, fotografija, rub ili druga oznaka.", st["body"]),
        p("Minimalna veličina", st["h2"]),
        bullet("samostalni znak: 24 px digitalno ili 8 mm u tisku;", st["sans"]),
        bullet("puni lockup: 140 px digitalno ili 38 mm u tisku.", st["sans"]),
        PageBreak(),
    ]

    # Logo misuse
    story += [
        section_label("03.1", "Nedopuštena uporaba", st),
        p("Logotip je identifikacijski alat, ne dekorativni element.", st["body"]),
        Spacer(1, 3 * mm),
        info_table([
            ["Ne raditi", "Razlog"],
            ["Rastezati, sabijati ili rotirati", "Mijenja prepoznatljivu geometriju"],
            ["Mijenjati odnos znaka i wordmarka", "Stvara paralelnu neslužbenu varijantu"],
            ["Primijeniti nasumičnu boju ili gradijent", "Ruši vezu s BSS paletom"],
            ["Dodavati 3D, sjaj, bevel ili dekorativnu sjenu", "Stvara jeftin i nedosljedan dojam"],
            ["Postaviti preko nečitke fotografije", "Smanjuje kontrast i prepoznatljivost"],
            ["Prepisati slova drugim fontom", "Mijenja službeni lockup"],
        ], [73 * mm, 92 * mm], st),
        Spacer(1, 8 * mm),
        p("Na malim površinama koristi se samo znak. Jednobojna varijanta koristi se kada tehnički postupak ne podržava brand boju.", st["body"]),
        PageBreak(),
    ]

    # Colors
    chips = [
        ColorChip(TEAL, "BSS Teal", "#0F766E"),
        ColorChip(DEEP, "Deep Green", "#062A26"),
        ColorChip(SIGNAL, "Signal Teal", "#14B8A6"),
        ColorChip(MINT, "Mint 50", "#ECFDF5", True),
        ColorChip(SURFACE, "Neutral 50", "#F8FBF9", True),
        ColorChip(INK, "Ink", "#17352B"),
    ]
    story += [
        section_label("04", "Boje", st),
        p("Brand Book preuzima boje iz BSS Design Systema v1.0. Primarna boja i semantička statusna boja imaju različite uloge.", st["body"]),
        Table(
            [[chips[0], chips[1], chips[2]], [chips[3], chips[4], chips[5]]],
            colWidths=[55 * mm] * 3,
            rowHeights=[34 * mm] * 2,
            hAlign="LEFT",
            style=TableStyle([
                ("FONTNAME", (0, 0), (-1, -1), "NotoSans"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ]),
        ),
        Spacer(1, 7 * mm),
        p("Preporučeni omjer", st["h2"]),
        info_table([
            ["60%", "Neutralne površine", "Bijela, mint i mirne sive"],
            ["30%", "Duboka zelena", "Hijerarhija, terminal i povjerenje"],
            ["10%", "Teal naglasak", "Radnja, povezanost i ključni signal"],
        ], [23 * mm, 56 * mm, 86 * mm], st, header=False),
        p("Statusne boje", st["h2"]),
        p("Zelena, amber, crvena i plava prenose točno definirano stanje u proizvodu. Ne koriste se kao dekorativna marketinška paleta i nikada nisu jedini nositelj značenja.", st["body"]),
        PageBreak(),
    ]

    # Typography
    story += [
        section_label("05", "Tipografija", st),
        p("Digitalni proizvod", st["h2"]),
        p("Inter i sistemski sans-serif niz iz Design Systema koriste se u aplikaciji, terminalu, web-stranici i prezentacijama. Primarna kvaliteta je brzo skeniranje podataka.", st["body"]),
        p("Inter / sistemski sans-serif", ParagraphStyle("Specimen", parent=st["h1"], fontName="NotoSans-Bold", fontSize=24, leading=29, textColor=TEAL)),
        p("Naslov 32 · podnaslov 24 · kartica 18 · tijelo 14 · pomoćni tekst 12 · oznaka 10", st["small"]),
        Spacer(1, 6 * mm),
        p("Službeni dokumenti", st["h2"]),
        p("Zaključani BSS Master Template koristi Noto Sans za naslove, tablice, oznake i operativne podatke te Noto Serif za duži urednički tekst.", st["body"]),
        p("Noto Sans Bold", ParagraphStyle("NotoSansSample", parent=st["h1"], fontName="NotoSans-Bold", fontSize=23, leading=28)),
        p("Noto Serif Regular — miran ritam za dulje čitanje i formalne dokumente.", ParagraphStyle("NotoSerifSample", parent=st["body"], fontName="NotoSerif", fontSize=15, leading=22)),
        p("Pravila", st["h2"]),
        bullet("ne uvoditi dodatnu obitelj fonta bez odluke Product Ownera;", st["sans"]),
        bullet("na naslovu se može koristiti negativan razmak slova, ali ne u tijelu teksta;", st["sans"]),
        bullet("svi fontovi u PDF-u moraju biti ugrađeni i imati Unicode mapiranje.", st["sans"]),
        PageBreak(),
    ]

    # Voice
    story += [
        section_label("06", "Ton komunikacije", st),
        info_table([
            ["Načelo", "Primjena"],
            ["Jasno", "Kratka rečenica i konkretan glagol"],
            ["Smireno", "Bez dramatiziranja, uskličnika i superlativa"],
            ["Ljudski", "Razumljivo radniku, voditelju i upravi"],
            ["Precizno", "Status, vrijeme i sljedeći korak"],
        ], [42 * mm, 123 * mm], st),
        p("Piši ovako", st["h2"]),
        bullet("“Zahtjev je spremljen i čeka odluku voditelja.”", st["sans"]),
        bullet("“Terminal nije povezan. Očitanja se čuvaju lokalno.”", st["sans"]),
        bullet("“Pregled za srpanj sadrži 22 zapisa.”", st["sans"]),
        p("Ne ovako", st["h2"]),
        bullet("“Revolucionirajte HR uz nevjerojatnu AI platformu!”", st["sans"]),
        bullet("“Oops! Nešto je pošlo po zlu :(”", st["sans"]),
        bullet("“Kliknite ovdje za više.”", st["sans"]),
        p("Struktura poruke", st["h2"]),
        p("1. što se dogodilo; 2. što to znači; 3. što korisnik može ili treba napraviti.", st["body"]),
        PageBreak(),
    ]

    # Messaging examples
    story += [
        section_label("06.1", "Poruke po kanalu", st),
        info_table([
            ["Kanal", "Primjer smjera", "Izbjegavati"],
            ["Web naslovnica", "Jasan poslovni problem, rješenje i jedan CTA", "Više konkurentskih poziva na radnju"],
            ["LinkedIn", "Stvaran primjer, mjerljiv rezultat ili naučena lekcija", "Generički motivacijski sadržaj"],
            ["Ponuda", "Opseg, vrijednost, granice i sljedeći korak", "Neprovjerena obećanja"],
            ["Aplikacija", "Status i posljedica odmah uz radnju", "Humor u greškama"],
            ["Podrška", "Priznati problem, dati korak i rok", "Prebacivati odgovornost na korisnika"],
        ], [31 * mm, 79 * mm, 55 * mm], st),
        Spacer(1, 7 * mm),
        p("Primarni dokazni niz", st["h2"]),
        p("RFID/NFC očitanje, evidencija vremena, pregled prema ulozi, odobravanje i kontrolirani izvještaj.", st["quote"]),
        p("Ovaj niz smije se koristiti u prodajnoj priči jer odgovara stvarnom Demo 3.0 opsegu.", st["body"]),
        PageBreak(),
    ]

    # Imagery
    story += [
        section_label("07", "Fotografija i ilustracija", st),
        p("Fotografija prikazuje stvarni radni kontekst: terminal u uporabi, ruke, ulaz u pogon, radionicu, gradilište ili skladište. Prednost imaju prirodno svjetlo, dokumentarni kadar i stvaran proizvod.", st["body"]),
        p("Poželjno", st["h2"]),
        bullet("stvarni BSS terminal i stvarno sučelje;", st["sans"]),
        bullet("jedan jasan fokus u kadru;", st["sans"]),
        bullet("prirodne boje materijala i brand teal samo kao signal;", st["sans"]),
        bullet("ljudi prikazani dostojanstveno i u stvarnom poslu.", st["sans"]),
        p("Izbjegavati", st["h2"]),
        bullet("generičke AI motive i robot + hologram estetiku;", st["sans"]),
        bullet("neon gradijente, cyberpunk i candy boje;", st["sans"]),
        bullet("pretjerano pozirane stock fotografije;", st["sans"]),
        bullet("lažne podatke i nepostojeće funkcije na sučelju.", st["sans"]),
        p("Ilustracije", st["h2"]),
        p("Jednostavne geometrijske linije, najviše dvije brand boje i bez 3D cartoon estetike. Dijagram ostaje tehnički točan i ima tekstualne oznake.", st["body"]),
        PageBreak(),
    ]

    # Hardware
    story += [
        section_label("08", "Terminal i hardver", st),
        p("Hardver mora pripadati istom sustavu kao web aplikacija.", st["body"]),
        info_table([
            ["Element", "Pravilo"],
            ["Kućište", "Mat grafitna ili duboko zelena površina; bez sjajnog gaming dojma"],
            ["Zaslon", "BSS teal kao primarni signal; jednostavan status i kratka uputa"],
            ["Svjetlo", "Teal spremno, zelena prihvaćeno, amber čekanje, crvena greška"],
            ["Oznaka", "BSS znak, model, serijski broj i kontakt podrške"],
            ["Zvuk", "Kratak, funkcionalan i usklađen s vizualnim stanjem"],
        ], [38 * mm, 127 * mm], st),
        Spacer(1, 8 * mm),
        BrandMark(22 * mm, label=True),
        Spacer(1, 5 * mm),
        p("Službena oznaka uređaja koristi predložak <b>bss-terminal-label.svg</b>, format 90 × 50 mm. Polja modela i serijskog broja moraju odgovarati stvarnom uređaju.", st["body"]),
        PageBreak(),
    ]

    # Applications
    story += [
        section_label("09", "Primjene", st),
        info_table([
            ["Materijal", "Format / predložak", "Ključno pravilo"],
            ["Posjetnica", "85 × 55 mm / bss-business-card.svg", "Miran kontrast i samo potrebni podaci"],
            ["Prezentacija", "16:9 / bss-presentation-cover.svg", "Jedna dominantna i jedna akcentna boja"],
            ["Ponuda", "A4 / BSS Master Template", "Puni pravni naziv izdavatelja i jasan opseg"],
            ["Uputa", "A4 ili responzivni web", "Koraci, stvarna snimka i upozorenje uz radnju"],
            ["Naljepnica", "90 × 50 mm / bss-terminal-label.svg", "Model, serijski broj i podrška"],
            ["Pakiranje", "Prema fizičkom proizvodu", "Znak, identitet sadržaja i osnovne upute"],
        ], [34 * mm, 60 * mm, 71 * mm], st),
        p("Web i prodaja", st["h2"]),
        p("Vrijednost se navodi u prvoj rečenici, dokaz u stvarnom podatku, a svaki lokalni kontekst ima jedan primarni poziv na radnju. BSS ne koristi vizualnu buku kao zamjenu za dokaz.", st["body"]),
        p("Korisničke upute", st["h2"]),
        p("Korak po korak, stvarni snimak sučelja, jasna numeracija i upozorenje neposredno uz radnju. Uputa ne pretpostavlja tehničko predznanje radnika.", st["body"]),
        PageBreak(),
    ]

    # Documents
    story += [
        section_label("09.1", "Službeni dokumenti", st),
        p("BSS Master Template v1.0 je zaključan.", st["quote"]),
        bullet("bijela podloga i jednostavna tipografska hijerarhija;", st["sans"]),
        bullet("Noto Sans i Noto Serif, svi fontovi ugrađeni;", st["sans"]),
        bullet("bez dekorativnih grafika i bez logotipa na svakoj stranici;", st["sans"]),
        bullet("zaglavlje sadrži samo datum dokumenta i verziju;", st["sans"]),
        bullet("PDF/A-2u, Unicode i veraPDF provjera prije isporuke.", st["sans"]),
        p("Naziv datoteke", st["h2"]),
        p("BSS_[TIP-DOKUMENTA]_vX.X_DD.MM.GGGG.pdf", ParagraphStyle("Filename", parent=st["sans"], fontName="NotoSans-Bold", textColor=TEAL, backColor=SURFACE, borderPadding=5 * mm, borderColor=LINE, borderWidth=.5)),
        p("Svaka sadržajna izmjena otvara novu verziju. Stara verzija se arhivira i ne prepisuje.", st["body"]),
        PageBreak(),
    ]

    # Governance
    story += [
        section_label("10", "Upravljanje i odobrenja", st),
        p("Izvor istine", st["h2"]),
        p("Boje, razmaci i digitalna tipografija dolaze iz BSS Design Systema v1.0. Brand Book objašnjava njihovu uporabu izvan aplikacije.", st["body"]),
        p("Product Owner odobrava promjenu", st["h2"]),
        bullet("službenog znaka ili lockupa;", st["sans"]),
        bullet("primarne brand boje;", st["sans"]),
        bullet("brand promisea ili javnog opisa proizvoda;", st["sans"]),
        bullet("službenog dokumentnog predloška;", st["sans"]),
        bullet("predloška koji se javno distribuira.", st["sans"]),
        p("Granica faze", st["h2"]),
        p("Brand Book ne mijenja backend, uloge, prava pristupa ni poslovnu logiku. Sljedeći korak je tehnički audit i zamrzavanje funkcionalnog opsega, a zatim BSS Refactor v1.", st["body"]),
        Spacer(1, 10 * mm),
        p("Vlasništvo nad odlukom", st["label"]),
        p("Tomislav · Product Owner", st["quote"]),
        PageBreak(),
    ]

    # Asset register
    story += [
        section_label("11", "Registar isporučenih asseta", st),
        info_table([
            ["Datoteka", "Namjena"],
            ["brand-book/index.html", "Živi i responzivni Brand Book"],
            ["bss-symbol.svg", "Samostalni BSS znak"],
            ["bss-logo-primary.svg", "Primarni lockup"],
            ["bss-logo-reversed.svg", "Lockup za tamnu podlogu"],
            ["bss-logo-monochrome.svg", "Jednobojni lockup"],
            ["bss-business-card.svg", "Predložak posjetnice"],
            ["bss-presentation-cover.svg", "Naslovnica prezentacije 16:9"],
            ["bss-terminal-label.svg", "Oznaka terminala 90 × 50 mm"],
            ["BSS_BRAND-BOOK_v1.0_11.07.2026.pdf", "Službeni PDF/A-2u dokument"],
            ["Figma: BSS Brand Book v1.0", "Pet ručno složenih brand frameova"],
        ], [76 * mm, 89 * mm], st),
        Spacer(1, 10 * mm),
        p("Verzija 1.0 zaključuje identitet potreban za tehnički audit i zamrzavanje funkcionalnog opsega.", st["body"]),
    ]
    return story


def add_pdfa2u_metadata() -> None:
    reader = PdfReader(str(RAW))
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    writer.pdf_header = "%PDF-1.7"

    root = writer._root_object
    root[NameObject("/Lang")] = TextStringObject("hr-HR")
    root[NameObject("/MarkInfo")] = DictionaryObject({NameObject("/Marked"): BooleanObject(False)})

    icc_path = Path("/usr/share/color/icc/sRGB.icc")
    if not icc_path.exists():
        raise FileNotFoundError(icc_path)
    icc = DecodedStreamObject()
    icc.set_data(icc_path.read_bytes())
    icc[NameObject("/N")] = NumberObject(3)
    icc[NameObject("/Alternate")] = NameObject("/DeviceRGB")
    icc_ref = writer._add_object(icc)
    output_intent = DictionaryObject({
        NameObject("/Type"): NameObject("/OutputIntent"),
        NameObject("/S"): NameObject("/GTS_PDFA1"),
        NameObject("/OutputConditionIdentifier"): TextStringObject("sRGB IEC61966-2.1"),
        NameObject("/Info"): TextStringObject("sRGB IEC61966-2.1"),
        NameObject("/RegistryName"): TextStringObject("http://www.color.org"),
        NameObject("/DestOutputProfile"): icc_ref,
    })
    root[NameObject("/OutputIntents")] = ArrayObject([writer._add_object(output_intent)])
    xmp = f'''<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="BSS Master Template v1.0">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" pdfaid:part="2" pdfaid:conformance="U"/>
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
   <dc:format>application/pdf</dc:format>
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">BSS Brand Book v1.0</rdf:li><rdf:li xml:lang="hr-HR">BSS Brand Book v1.0</rdf:li></rdf:Alt></dc:title>
   <dc:creator><rdf:Seq><rdf:li>Bognar Smart Systems</rdf:li></rdf:Seq></dc:creator>
   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">Vizualni i komunikacijski identitet BSS branda.</rdf:li></rdf:Alt></dc:description>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmp:CreateDate="2026-07-11T21:00:00+02:00" xmp:ModifyDate="2026-07-11T21:00:00+02:00" xmp:MetadataDate="2026-07-11T21:00:00+02:00" xmp:CreatorTool="BSS Master Template v1.0"/>
  <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" pdf:Producer="BSS PDF/A-2u pipeline" pdf:Keywords="BSS, Bognar Smart Systems, Brand Book, SaaS, IoT"/>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>'''.encode("utf-8")
    metadata = DecodedStreamObject()
    metadata.set_data(xmp)
    metadata[NameObject("/Type")] = NameObject("/Metadata")
    metadata[NameObject("/Subtype")] = NameObject("/XML")
    root[NameObject("/Metadata")] = writer._add_object(metadata)
    writer.add_metadata({
        "/Title": "BSS Brand Book v1.0",
        "/Author": "Bognar Smart Systems",
        "/Subject": "Vizualni i komunikacijski identitet BSS branda",
        "/Keywords": "BSS, Bognar Smart Systems, Brand Book, SaaS, IoT",
        "/Creator": "BSS Master Template v1.0",
        "/Producer": "BSS PDF/A-2u pipeline",
        "/CreationDate": "D:20260711210000+02'00'",
        "/ModDate": "D:20260711210000+02'00'",
    })
    with FINAL.open("wb") as handle:
        writer.write(handle)


def validate_structure() -> dict:
    reader = PdfReader(str(FINAL))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    normalized_text = " ".join(text.split())
    required = [
        "Bognar Smart Systems", "Od podatka na terenu do jasne odluke",
        "BSS Design Systema v1.0", "BSS Refactor v1", "Đakova",
    ]
    missing = [item for item in required if item not in normalized_text]
    root = reader.trailer["/Root"]
    metadata = root["/Metadata"].get_object().get_data().decode("utf-8")
    output_intents = root.get("/OutputIntents", [])
    if missing:
        raise RuntimeError(f"Nedostaje tekst nakon Unicode ekstrakcije: {missing}")
    if len(reader.pages) < 15:
        raise RuntimeError("Brand Book ima premalo stranica")
    if 'pdfaid:part="2"' not in metadata or 'pdfaid:conformance="U"' not in metadata:
        raise RuntimeError("Nedostaje PDF/A-2u XMP identifikacija")
    if not output_intents:
        raise RuntimeError("Nedostaje PDF/A OutputIntent")
    return {
        "file": str(FINAL.relative_to(ROOT)),
        "pages": len(reader.pages),
        "unicode_text_characters": len(text),
        "pdfa_part": 2,
        "pdfa_conformance": "U",
        "output_intents": len(output_intents),
        "size_bytes": FINAL.stat().st_size,
    }


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    register_fonts()
    st = styles()
    doc = SimpleDocTemplate(
        str(RAW), pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm,
        topMargin=24 * mm, bottomMargin=18 * mm,
        title="BSS Brand Book v1.0", author="Bognar Smart Systems",
        subject="Vizualni i komunikacijski identitet BSS branda",
        lang="hr-HR", displayDocTitle=True,
    )
    doc.build(
        build_story(st),
        onFirstPage=first_page,
        onLaterPages=later_page,
        canvasmaker=BSSCanvas,
    )
    add_pdfa2u_metadata()
    print(json.dumps(validate_structure(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
