import {test,expect} from '@playwright/test';
test('全库编辑内容与无时间保护',async({page,request})=>{
 const base=process.env.EDITORIAL_TEST_URL||'http://127.0.0.1:18342';
 const rows=await(await request.get(base+'/api/courses')).json();
 expect(rows).toHaveLength(111);
 for(const c of rows){
  const d=await(await request.get(base+'/api/courses/'+c.id)).json();
  expect(d.curated).toBe(true);
  for(const v of d.vocabulary){expect(v.term.trim()).not.toBe('');expect(v.definition.trim()).not.toBe('');}
 }
 await page.goto(base);
 await page.getByRole('button',{name:'开始听一课'}).click();
 await expect(page.locator('.vocab-row').nth(1)).toBeVisible();
 await expect(page.locator('.study')).not.toContainText('待听校');
 await expect(page.locator('.study')).not.toContainText('Audio Review · 完整原文');
 await expect(page.getByRole('button',{name:/^回听 /})).toHaveCount(13);
 await page.getByRole('button',{name:'Dialogue',exact:true}).click();
 expect(await page.locator('.dialogue-lines p').count()).toBeGreaterThan(3);
 await expect(page.getByRole('button',{name:/循环对话/})).toHaveCount(1);
});
