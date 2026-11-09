// Read-only local release preflight. Never creates or activates backend records.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const release=JSON.parse(readFileSync('src/legal/drafts/release-values.json','utf8'));
const issues=[];
const validDate=typeof release.effective_date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(release.effective_date)&&!Number.isNaN(Date.parse(release.effective_date))&&new Date(release.effective_date).toISOString().slice(0,10)===release.effective_date;
if(!validDate)issues.push('Set effective_date to the confirmed YYYY-MM-DD release date; no date is inferred.');
const expectedLabel=validDate?new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(release.effective_date)):null;
if(validDate&&release.effective_date_label!==expectedLabel)issues.push('effective_date_label must match the confirmed ISO release date in Month D, YYYY format.');
const documents=[['privacy','src/legal/drafts/privacy-policy-v1.0.md',15],['terms','src/legal/drafts/terms-of-service-v1.0.md',19]].map(([type,file,expectedCount])=>{
 const raw=readFileSync(file),text=new TextDecoder('utf-8',{fatal:true}).decode(raw),headings=[...text.matchAll(/^## (\d+)\. (.+)$/gm)];
 if(raw[0]===0xef&&raw[1]===0xbb&&raw[2]===0xbf)issues.push(file+': remove the UTF-8 BOM.');
 if(text.includes('\r'))issues.push(file+': use stable LF line endings.');
 if(!text.includes(`**Version:** ${release.version}  \n`))issues.push(file+': version metadata does not match release-values.json.');
 if(headings.length!==expectedCount||headings.some((h,i)=>Number(h[1])!==i+1))issues.push(file+': numbered sections must remain complete and sequential.');
 if(/\{\{[^}]+\}\}/.test(text))issues.push(file+': replace the EFFECTIVE_DATE release token before publication.');
 if(validDate&&!text.includes(`**Effective date:** ${release.effective_date_label}\n`))issues.push(file+': effective date must match the confirmed release label.');
 return {type,file,sha256:createHash('sha256').update(raw).digest('hex'),bytes:raw.length,encoding:'UTF-8 without BOM',line_endings:text.includes('\r')?'non-LF':'LF',sections:headings.length};
});
console.log(JSON.stringify({version:release.version,effective_date:release.effective_date,effective_date_label:release.effective_date_label,source_values_resolved:issues.length===0,legal_approval:false,documents,issues,note:'Hashes describe the exact current raw bytes. Regenerate hashes after every edit. This is not permission to publish or activate.'},null,2));
if(process.argv.includes('--require-ready')&&issues.length)process.exitCode=1;
