# Write a course for learn-site with AI

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
/plugin marketplace add Jightning/learn-site
/plugin install create-course@learn

# adding as a plugin without installing
claude --plugin-dir plugin
```

**Other Agents:**

```sh
node install.mjs ~/my-courses   # for other agents
```
