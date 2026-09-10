const {execFileSync}=require('node:child_process');
for(const file of ['accounts.mjs','account-cache.cjs','book.cjs','materials.cjs','completion.cjs','highlight.cjs','markdown.cjs']) execFileSync(process.execPath,['tests/'+file],{stdio:'inherit'});
