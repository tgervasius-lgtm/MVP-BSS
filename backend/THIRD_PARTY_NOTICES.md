# Backend third-party license decisions

## Noto Sans 2.004 desktop builds

New PDF reports embed the unmodified Noto Sans Regular and Bold TTF files in
`assets/report-fonts`. These builds include basic and extended Latin letters
in a single font. The source is the Noto Sans 2.004 distribution packaged in
Debian fonts-noto-core. Copyright 2015 Google LLC. The full SIL Open Font
License 1.1 is included in `assets/report-fonts/OFL.txt` and travels with the fonts
in the backend build.

## big-integer 1.6.52

`big-integer` is required transitively by
`exceljs@4.4.0 -> unzipper@0.10.14 -> big-integer@1.6.52`. ExcelJS is used to
generate and test the contracted XLSX report export. The installed package
declares `Unlicense` and contains the complete Unlicense/public-domain
dedication in `node_modules/big-integer/LICENSE`. The dependency-review
classifier's compound `LicenseRef-scancode-public-domain AND Unlicense`
describes that same evidence; the repository does not treat arbitrary
`LicenseRef` values as approved. This exact version is narrowly approved while
the XLSX implementation depends on ExcelJS.
