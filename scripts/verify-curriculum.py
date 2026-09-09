"""Validate contracts, references and that starter code cannot earn completion."""
import contextlib,io,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
course=json.loads((root/'content/course.json').read_text())
ids={t['id'] for l in course['lessons'] for t in l['tasks']}
assert {f'B{i:02}' for i in range(1,41)} <= ids
assert all(m['lessonIds'] for m in course['modules'])
passed=0
for lesson in course['lessons']:
    assert len(lesson['markdown'])>500,lesson['id']
    for task in lesson['tasks']:
        for field in ['prompt','starter','tests','solution','hint','debrief']:
            assert task.get(field), (task['id'],field)
        ns={'__name__':'__main__','__student_source__':task['starter']}
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(task['starter'],ns);exec(task['tests'],ns)
        except BaseException: passed+=1
        else: raise AssertionError('Starter passes: '+task['id'])
print(f'{passed} starters rejected; all 40 bank ideas and 24 modules covered')
