# r21.22 source recovery overlay

These numbered files are consecutive binary pieces of a ZIP containing the 346
files that were present in the durable
`SynthAI-FULL-SUITE-r21.22-self-cultivation-graph-integrated.zip` parent but
were absent from the Git donor merge.

The omitted material is not optional: it contains 64 original sprite frames,
the BiVerse Human Design knowledge/runtime set, and the retained book indexes
and source material. The build restores these files additively before testing
or packaging. Existing newer files are not deleted or replaced.

- Original complete parent ZIP SHA-256:
  `e3c6aba2a3645a66840ec52de79eee3d872408fdb318a358b0843bdac79227b6`
- Recovery overlay ZIP SHA-256:
  `dd140f99d5c65ec4529059fa965e47fb84c634ebb514a0d7e15e0c1897664928`
- File manifest SHA-256:
  `8bc300eca591fd74b551a7f017f0a37ca8b998ecf29c525b5261039575e3fa76`
- Restored files: `346`

Run `.github/scripts/restore-r21-parent.sh` from any checkout location. The
script reconstructs the ZIP, validates both archive and per-file hashes, and
then verifies the required BiVerse, book, runtime, and sprite surfaces.
