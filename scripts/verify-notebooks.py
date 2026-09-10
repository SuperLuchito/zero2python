from pathlib import Path
import nbformat
from nbclient import NotebookClient
root=Path(__file__).resolve().parents[1]
for file in sorted((root/'public/curriculum').glob('*.ipynb')):
    book=nbformat.read(file,as_version=4)
    client=NotebookClient(book,timeout=120,kernel_name='python3')
    client.execute()
    # Keep downloads clean; store executed evidence outside source tree.
    target=Path('/private/tmp')/('verified-'+file.name)
    nbformat.write(book,target)
    print(file.name, 'all cells passed', flush=True)
