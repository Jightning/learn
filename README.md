# Learn

[Check it out here](https://learn-12i.pages.dev/)

A site for more optimized learning. A course gets imported and displayed in nice and structured fashion. This functions as a study tool for both long and short term learning with review, notes, and quick lookup functionality.

A course is the specific thing you want to learn/study (like a class, or certain subject). You can ask an AI to easily [design the course](#write-a-course-with-ai). The course is made by formatting the needed course data. The code and visual experience is handled by this site.

## Using

### Getting started

1. [Make a course](#writing-a-course) for the content you want to learn.
2. Click `Add Course` to browse the prebuilt library (which starts with DEMO), or import a course folder, .zip, or .course.json file from your device.
3. Click on the course to enter. There'll be a sidebar with all the course sections, and the different features:
    - **Overview** has an Index link at the top for course concepts and categories.
    - **Review** opens questions due from concepts you've attempted. Choose *Mixed practice* there to practise a range of subsections, including questions that are not due.
    - **Dependency Map** demonstrates how sections connect to each other.
    - **Explore** lets you find information by search and filters.
    - **Saved** shows the blocks you saved with notes.
4. Each section is split into subsections which is further split into blocks.
    - Each block represents some form of information.
    - Some blocks are hidden depending on the mode, but they can always be opened (there will always be a sign of it being there, so you're not missing anything).
    - You can click/drag down on the horizontal tabs on the bottom of the block to save a **note** (notes will appear in *Saved*).
    - Blank notes act as simple bookmarks that still appear in *Saved*.
5. The top right provides **Study**, **Review**, and **Names** modes. These correspond to the depth of information shown.
    - **Study** is like reading through a textbook. It shows the most, with the only things hidden being the *In Depth* blocks.
    - **Review** is like going through ones notes. Each block may have a description which is used instead of the full content. Certain blocks are also not hidden. This view is tailored by the course creator.
    - **Names** hides everything, showing the bare minimum.

## Writing a course

To start working on a course:

```sh
#               id       name
npm run new -- ma26600 "Ordinary Differential Equations"
```

This will add a course to `courses/ma26600`.

You can then start working on the course within that folder.
The changes can be validated with:

```sh
npm run validate -- ma26600
npm run validate:current -- ma26600       # require the current question schema
npm run validate -- --migration-report ma26600  # count legacy questions to migrate
npm run audit -- --profile draft ma26600    # report content debt while writing
npm run coverage -- ma26600 --init-review   # create low-topic review checklist
npm run audit -- --profile publish ma26600  # required before calling it publish-ready
```

Normal validation and the reader continue to accept legacy `q/a` questions and
`drills/` banks. `validate:current` applies the strict current schema, and the
publish audit applies that same check while printing a per-course migration
count.

The publish audit requires zero unverified answers and a reviewed source
disposition on every claim, plus a reviewed disposition for low-scoring source
topics in `materials/coverage-review.yaml`. A low score is a lead for review,
not proof of missing teaching. Draft reporting remains nonblocking. Then import
your course to the site and inspect it as a reader.

`node plugin/scripts/pack.mjs <id>` creates a `.course.json` you can import into a site (not needed though, you can just import the course folder).

### Write a course with AI

Add the course content under `courses/<your-course>/sources` (so the model know what to work off). If you add your course textbook, it'll be able to reference specific textbook portions, and provide a greater guarantee of coverage.

[This document](docs/create_course.md) details how to write out a course.
[This document](docs/writing.md) is for AI's prose/writing.

The AI can use the `create-course` skill, which runs these:

```sh
node tools/author.mjs begin ma26600 --source ~/code/some-repo  # sources + the rules for the course's shape
node tools/author.mjs write ma26600 --lean  # the writing rules (--lean: cheaper)
node tools/author.mjs done ma26600 s1-6 /abs/source.md  # records a subsection, and names the next
node tools/author.mjs finish ma26600  # materials, validation, coverage
npm run coverage -- ma26600 --init-review  # create the source-topic review checklist
```

**Claude:**

```sh
# to add as a plugin
/plugin marketplace add Jightning/learn
/plugin install create-course@learn

# adding as a plugin without installing
claude --plugin-dir plugin
```

**Other Agents:**

Run the following command

```sh
node plugin/install.mjs ~/my-courses   # for other agents, adds the AGENTS.md which links back to this repo
```

## Development

Developing:

```sh
npm install
npm run dev
```

Building:

```sh
npm run build  # for dist/
npm run deploy  # builds, publishes to Cloudflare Pages, and keeps 2 newest deployments
npm run check  # engine checks against demo and _template; user courses are not read
```

Testing:

```sh
npm run test  # full testing

npm run test:unit
npm run test:integration
npm run test:browser
```

### Adding a Public Course

After making a course, it can be made public by adding the course to the gitignore, and including it in `tools/lib/files.mjs` under `PUBLIC_CATEGORIES`.
