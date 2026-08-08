# Backend third-party license decisions

## Noto Sans 5.2.10

The backend embeds the unmodified `noto-sans-latin-ext-400-normal.woff` and
`noto-sans-latin-ext-600-normal.woff` files from `@fontsource/noto-sans` in
generated PDF reports. The font is not sold by itself.

Copyright 2022 The Noto Project Authors
(https://github.com/notofonts/latin-greek-cyrillic).

The package and font files are distributed under the SIL Open Font License
1.1. The installed package preserves the complete copyright and license text
in `node_modules/@fontsource/noto-sans/LICENSE`; npm distribution retains that
file. This use is therefore narrowly approved for
`@fontsource/noto-sans@5.2.10`.

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
