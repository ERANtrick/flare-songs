Bootstrap Icons v1.11.3

The unmodified SVGs in `assets/icons/` come from the official Bootstrap Icons project:
https://github.com/twbs/icons/tree/v1.11.3/icons

Included icons: shuffle.svg, play-fill.svg, music-note-list.svg.

Copyright (c) 2019-2024 The Bootstrap Authors.
These files are distributed under the MIT License; see `bootstrap-icons-LICENSE.txt`.


## Locally distributed libraries

The files under `assets/vendor/` are unmodified npm distributions. Their existing headers and sourceMappingURL comments are preserved. The two Bootstrap maps include all sourcesContent; no node_modules or separate source tree needs to be published.

| Component | Exact version / use | Provider | License and complete notice |
| --- | --- | --- | --- |
| Bootstrap CSS and bundle JS | 5.3.2, including its original maps | [The Bootstrap Authors](https://github.com/twbs/bootstrap/tree/v5.3.2) | MIT; [full license](bootstrap-5.3.2-LICENSE.txt), Copyright (c) 2011-2023 The Bootstrap Authors |
| Papa Parse | 5.3.2 | [Matthew Holt / PapaParse](https://github.com/mholt/PapaParse/tree/5.3.2) | MIT; [full license](papaparse-5.3.2-LICENSE.txt), Copyright (c) 2015 Matthew Holt |
| Popper Core | 2.11.8, embedded in the Bootstrap bundle and its map; not loaded separately | [Popper.js](https://github.com/popperjs/popper-core/tree/v2.11.8) | MIT; [full license](popper-2.11.8-LICENSE.txt), Copyright (c) 2019 Federico Zivolo |
| RFS | 10.0.0, vendored Sass embedded in the Bootstrap CSS map | [Martijn Cuppens / RFS](https://github.com/twbs/rfs) | MIT; [full license](rfs-10.0.0-LICENSE.txt), Copyright (c) 2017-2019 Martijn Cuppens |
| Normalize.css attribution | Bootstrap Reboot documents an MIT-licensed Normalize.css derivation | [Nicolas Gallagher and Jonathan Neal](https://github.com/necolas/normalize.css) | MIT; [full upstream notice](normalize-LICENSE.txt), Copyright © Nicolas Gallagher and Jonathan Neal |

The Normalize notice is copied from the upstream 8.0.1 package for the Reboot attribution. It does not assert that Bootstrap Reboot is an unchanged Normalize.css 8.0.1 release; no standalone Normalize library is loaded. RFS map source matches rfs@10.0.0 exactly; the 55 Popper map sources match @popperjs/core@2.11.8 exactly. Bootstrap Icons v1.11.3 and its existing notice above remain unchanged.
