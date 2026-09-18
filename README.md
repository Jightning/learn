# Learn

[Check it out here](https://learn-12i.pages.dev/)

A site for more optimized learning. A course gets imported and displayed in nice and structured fashion. This functions as a study tool for both long and short term learning.

A course is this specific thing you want to learn/study (like a class, or certain subject). The courses themselves have a specific file structure. You can ask an AI to design the course by giving it the needed content, and then providing it the instructions in `docs/create_course.md` and `docs/writing.md` (the AI must be able to create/edit files). The courses and quiz data stays locally in your browser. You can sync it with another device using Tailscale (below).

Each course will be split into sections with quizzes after each section. The section quizzes will be unique, with repetition practice as something separate.

A course is split by sections, then sub-sections, then cards. Each card has it's own
type of view depending on the **SHOW** mode. Textbook is the most verbose, showing the
full extent of all the cards. Notes is better for review and overviews.

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
npm run check
```

Finally import your course to the site and enjoy.

`node plugin/scripts/pack.mjs <id>` creates a `.course.json` you can import into a site (not needed though, you can just import the course folder).

**Write a course with AI:**

Add the course content under `courses/your-course/sources` (so the model know what to work off).

[This document](docs/create_course.md) details how to write out a course.
[This document](docs/writing.md) is for AI's prose/writing.

The AI uses the `create-course` skill, which runs these:

```sh
node tools/author.mjs begin ma26600 --source ~/code/some-repo  # sources + the rules for the course's shape; resumes where it left off
node tools/author.mjs write ma26600 --lean  # the writing rules, once (--lean: cheaper)
node tools/author.mjs done ma26600 s1-6 /abs/source.md  # records one subsection, names the next
node tools/author.mjs finish ma26600  # materials, validation, coverage
npm run coverage -- ma26600  # does a comparison to see if the course is covering everything
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

```sh
node plugin/install.mjs ~/my-courses   # for other agents
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
```
