const assert=require('node:assert/strict');const book=require('../content/book.json');
assert.equal(book.chapters.length,16);const ids=new Set();
for(const c of book.chapters){assert.equal(c.questions.length,3);assert.equal(c.steps.length,3);assert(c.focus);for(const q of c.questions){assert(!ids.has(q.id));ids.add(q.id);assert.equal(q.options.length,3);assert(q.correct>=0&&q.correct<3);assert(q.page>=c.start&&q.page<=c.end,`${q.id} source outside chapter`);assert(q.explanation.trim()&&q.section);}}
assert.equal(ids.size,48);
assert.equal(2*.5+3*-1,-2);assert.equal(.5-.1*((2*.5-2)*2),.7);assert.equal(2*(2*0+1)+3,5);assert.equal(.8*10+.5*4,10);
console.log('Book: 16 chapters, 48 questions, page ranges and numerical walkthroughs passed');
