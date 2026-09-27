import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// TypeScript is an existing project development dependency. This test does
// not require a running web server or database.
const ts = require("typescript");
const root = path.resolve(import.meta.dirname, "..");
const app = path.join(root, "app");
const read = (s) => readFileSync(path.join(root, s), "utf8");
let failures = 0, successes = 0;
function test(description, good) {
  if (good) {console.log("PASS - " + description); successes++;}
  else {console.error("FAIL - " + description); failures++;}
}
function files(dir) {
  return readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):d.name.endsWith('.tsx')?[path.join(dir,d.name)]:[]);
}
let syntaxProblems=[];
let directServerActionSubmitButtons=0, enhancedServerActionSubmitButtons=0;
const modified = files(app);
for(const file of modified){
 const text=readFileSync(file,'utf8');
 const parsed=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 for(const d of parsed.parseDiagnostics??[]) syntaxProblems.push(path.relative(root,file)+':'+d.messageText);
 function walk(node,inActionForm=false){
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(parsed)==='form'){
    const action=node.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.text==='action');
    if(action?.initializer && ts.isJsxExpression(action.initializer))inActionForm=true;
  }
  if(inActionForm&&ts.isJsxElement(node)){
    const tag=node.openingElement.tagName.getText(parsed);
    if(['button','FormSubmitButton'].includes(tag)){
      const attr=node.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.text==='type');
      const value=attr?.initializer&&ts.isStringLiteral(attr.initializer)?attr.initializer.text:'submit';
      if(value!=='button'&&value!=='reset'){
        if(tag==='button')directServerActionSubmitButtons++;
        else enhancedServerActionSubmitButtons++;
      }
    }
  }
  ts.forEachChild(node,n=>walk(n,inActionForm));
 }
 walk(parsed);
}
test('all TSX app files parse without syntax errors (' + modified.length + ')',syntaxProblems.length===0);
if(syntaxProblems.length)console.error(syntaxProblems.join('\n'));
test('all 53 server-action form submit controls show async feedback',enhancedServerActionSubmitButtons===53);
test('no raw server-action submit controls remain',directServerActionSubmitButtons===0);
const button=read('app/_components/FormSubmitButton.tsx');
test('React useFormStatus controls pending lifecycle',button.includes('useFormStatus')&&button.includes('const { pending }'));
test('pending submit button prevents duplicate actions',button.includes('disabled={Boolean(disabled) || pending}')&&button.includes('aria-busy={pending}'));
test('pending state renders real spinner',button.includes('momo-button-spinner')&&button.includes('sr-only'));
const login=read('app/_components/SubmitLoginOnEnter.tsx');
test('Enter still uses native requestSubmit validation',login.includes('form.requestSubmit()'));
test('Enter respects active login request',login.includes('if (pending)'));
const css=read('app/globals.css');
test('shared button feedback provides press, spinner and reduced-motion rules',css.includes('data-momo-pressed')&&css.includes('momo-button-spinner')&&css.includes('prefers-reduced-motion'));
const interactions=read('app/_components/AppInteractionFeedback.tsx');
test('button feedback responds to pointer and keyboard inputs',interactions.includes('pointerdown')&&interactions.includes('keydown')&&interactions.includes('Enter'));
test('input Enter highlights submit button before async request',interactions.includes('input.type !== "email" && input.type !== "password"'));
test('root layout mounts a single global feedback listener',read('app/layout.tsx').includes('<AppInteractionFeedback />'));
test('both login pages use pending submit button', ['app/admin/login/page.tsx','app/portal/login/page.tsx'].every(x=>read(x).includes('<FormSubmitButton')));
test('legal page preserves border-white/6',read('app/legal/page.tsx').includes('border-white/6')&&!read('app/legal/page.tsx').includes('border-white/[0.06]'));
console.log(`\n${successes}/${successes+failures} checks passed`);
if(failures)process.exitCode=1;
