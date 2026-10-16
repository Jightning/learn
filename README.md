# Learn

[Check it out here](https://learn-12i.pages.dev/)

A site for more optimized learning. A course gets imported and displayed in nice and structured fashion. This functions as a study tool for both long and short term learning with review, notes, and quick lookup functionality.

A course is the specific thing you want to learn/study (like a class, or certain subject). You can ask an AI to easily [design the course](#write-a-course-with-ai). The course is made by formatting the needed course data. The code and visual experience is handled by this site.

## Using

### Getting started

1. [Make a course](#writing-a-course) for the content you want to learn.
2. Click `Add Course` to browse prebuilt library or to import a course folder, .zip, or .course.json file from your device.
3. Click on the course to enter. There'll be a sidebar with all the course sections, and the different features:
    - **Overview** has an Index link at the top for course concepts and categories.
    - **Review** opens questions due from concepts or question types you've attempted. Choose *Mixed practice* there to practice a range of subsections, including questions that are not due. Question-bank courses share the same questions and history across lessons and practice; reserved check questions stay separate.
    - **Dependency Map** demonstrates how sections connect to each other.
    - **Explore** lets you find information by search and filters.
    - **Saved** shows the blocks you saved with notes.
4. Each section is split into subsections which is further split into blocks.
    - Each block represents some form of information.
    - You can click/drag down on the horizontal tabs on the bottom of the block to save a **note** (notes will appear in *Saved*).
    - Blank notes act as simple bookmarks that still appear in *Saved*.
5. The top right allows the user to switch between 3 different modes (**Study**, **Review**, **Names**) corresponding to the verbosity of information.

## Writing a course

To start working on a course:

```sh
#               id       name
npm run new -- ma26600 "Ordinary Differential Equations"
```

This starts the course at `courses/ma26600`.

```sh
node tools/author.mjs begin ma26600 --mode single --handoff manual # provide context for AI or human
node tools/author.mjs status ma26600
```

[`docs/create_course.md`](docs/create_course.md) for the workflow. \
[`docs/writing.md`](docs/writing.md) for composition and question guidance. \
The authoring packet under [`authoring/`](authoring/entrypoint.md) is the working contract. \
`node tools/pack.mjs <id>` to create an importable `.course.json` bundle. \

### Write a course with AI

Use **single** for one context, **paired manual** for explicit planner, writer,
and reviewer handoffs, or **paired auto** for bounded writer batches. Select the
mode once when beginning the course; the saved status records progress.

For paired manual mode, follow the prompts produced by `author.mjs` at each
handoff. Corrections return to the writer; only the reviewer accepts them.

[`authoring/entrypoint.md`](authoring/entrypoint.md) and
[`authoring/manifest.yaml`](authoring/manifest.yaml) define which current rules
and formats the workflow loads.

```sh
node tools/author.mjs begin ma26600 --mode paired --handoff manual --source /abs/textbook.pdf
node tools/author.mjs status ma26600
node tools/author.mjs index ma26600
node tools/author.mjs preview ma26600 --sub s1-1 # assembled reading
node tools/author.mjs screen ma26600 --changed
node tools/validate.mjs --isolated --strict-current ma26600
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

To make an approved course public, add an exception for its folder in `.gitignore` and register its ID and library category in `PUBLIC_CATEGORIES` in `tools/lib/files.mjs`. Commit the reader files with these changes so builds after a push include the course. Keep authoring `sources/` excluded; the build also omits those files.
