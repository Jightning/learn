# Course and material schemas

```yaml
code: COURSE-ID
title: Course title
tagline: >-
  One sentence for the reader.
meta: Source or provenance
theme: {hue: 200}
state: {enabled: true}
retention: {target: 0.9}
audit: {unsourced: 0.1}
```

`materials/expectations.md` is required and its front matter includes
`exam.format` and `exam.dates`. `syllabus.md`, `schedule.md`, and
`reference.md` are optional. Generated `problems.md`, `checklist.md`, and
coverage review artifacts are produced by the CLI; do not hand-edit generated
files. `concepts/<key>.yaml` and `categories/<key>.yaml` have their own format
modules.
