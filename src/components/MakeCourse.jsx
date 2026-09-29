export default function MakeCourse() {
  return (
    <main class="make-course">
      <p class="make-course-back"><a href="#/">Back to courses</a></p>
      <h1>Making a course</h1>
      <p>Give an AI (who can create/edit files) your learning goal and source material, then ask it to
        make you a course using the <a href="https://github.com/Jightning/learn/blob/main/docs/create_course.md" target="_blank" rel="noreferrer">course guide</a>.</p>
      <p>Ask for a downloadable <code>.zip</code>. Bring that ZIP back here and choose
        <strong> Upload .zip or .json</strong> in order to import the course.</p>
      <p>Unless the sync is setup, the course will only stay on your browser, so you may want to hold onto that file.</p>
    </main>
  );
}
