import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const $=id=>document.getElementById(id), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene=new T.Scene();scene.background=new T.Color('#071019');scene.fog=new T.Fog('#071019',12,28);
const camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.05,60);camera.position.set(4.3,3.8,5.3);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;$('stage').append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.75,0);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=11;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=false;
scene.add(new T.HemisphereLight(0xcbe8ff,0x172536,2));
function light(color,power,x,y,z){const l=new T.DirectionalLight(color,power);l.position.set(x,y,z);scene.add(l);return l;}
const key=light(0xd9edff,4,3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;light(0x4de5d1,2,-4,3,-3);
const mat=(color,metalness=0,roughness=.5)=>new T.MeshStandardMaterial({color,metalness,roughness});
const black=mat('#15202a',.15,.72),liner=mat('#10161c',.05,.88),silver=mat('#9eafb9',.85,.25),red=mat('#b91f35',.2,.38),rubber=mat('#080d12',0,.95),body=mat('#38434d',.7,.3),glow=new T.MeshStandardMaterial({color:'#a7fff0',emissive:'#52e8ca',emissiveIntensity:2});
function box(parent,w,h,d,x,y,z,material,r=.035){const o=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,r),material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const root=new T.Group();scene.add(root);
// Open tub: separate floor and walls leave the contents genuinely visible.
box(root,3.2,.12,1.65,0,.15,0,liner);box(root,3.3,.77,.12,0,.53,-.83,liner);box(root,3.3,.77,.12,0,.53,.83,liner);
for(const s of [-1,1]){box(root,.13,.77,1.7,s*1.62,.53,0,liner);box(root,.25,.12,2.15,s*1.76,.97,-.1,body);box(root,.12,.42,2.3,s*1.85,.8,-.1,body);box(root,.08,.25,.12,s*1.86,.83,1.06,red);}
for(let x=-1.45;x<1.5;x+=.16)box(root,.025,.025,1.5,x,.225,0,black,.008);
box(root,3.35,.1,.19,0,.97,.94,body);box(root,3.35,.1,.32,0,.97,-1.03,body);
const lid=new T.Group();lid.position.set(0,1,-.87);root.add(lid);box(lid,3.3,.12,1.8,0,.05,.9,body);box(lid,3.05,.08,1.55,0,-.04,.9,liner);
for(let x=-1.4;x<1.5;x+=.18)box(lid,.04,.035,1.45,x,.13,.9,black,.008);
box(lid,.4,.04,.17,0,.13,1.64,black);box(lid,2.8,.025,.035,0,-.09,1.52,glow,.008);
const strip=new T.PointLight(0x65ffe0,0,4);strip.position.set(0,1.6,.2);root.add(strip);
const items=[];
function item(name,x,y,z,lift,spread){const g=new T.Group();g.position.set(x,y,z);root.add(g);items.push({g,name,home:g.position.clone(),lift,spread});return g;}
function toolCase(name,x,y,z,w,d,color,lift,spread){const g=item(name,x,y,z,lift,spread);box(g,w,.34,d,0,.17,0,color);box(g,w+.02,.055,d+.02,0,.32,0,rubber);for(const s of [-1,1]){box(g,.09,.12,.055,s*w*.31,.22,d/2+.02,silver);box(g,.065,.37,d+.02,s*w*.4,.18,0,rubber);}box(g,.4,.06,.08,0,.43,0,rubber);for(const s of [-1,1])box(g,.06,.1,.08,s*.19,.38,0,silver);return g;}
toolCase('Red tool case',-.65,.24,.36,1.38,.65,red,.8,-.35);
toolCase('Rear equipment case',-.65,.26,-.4,1.35,.57,black,1.7,-.55);
const bag=item('Tool bag',.87,.24,-.3,1.4,.5);box(bag,1.05,.52,.8,0,.26,0,black,.12);for(const s of [-1,1])box(bag,.035,.46,.82,s*.33,.32,0,red,.012);box(bag,.55,.055,.09,0,.64,0,rubber);for(const s of [-1,1])box(bag,.045,.25,.055,s*.25,.52,0,black);
const battery=item('Accessory battery',.9,.24,.51,.9,.55);box(battery,.65,.23,.42,0,.12,0,rubber);box(battery,.58,.07,.39,0,.26,0,mat('#89933e',.25));box(battery,.2,.02,.19,0,.31,0,silver);
const towel=item('Paper towel roll',-1.37,.25,-.12,1.25,-.65);const roll=new T.Mesh(new T.CylinderGeometry(.13,.13,.5,24),mat('#e5e2d4'));roll.position.y=.25;roll.castShadow=true;towel.add(roll);const hole=new T.Mesh(new T.CylinderGeometry(.045,.045,.006,20),black);hole.position.y=.503;towel.add(hole);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),mat('#071019',.15,.8));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.08;scene.add(floor);
const grid=new T.GridHelper(30,60,0x244c55,0x112732);grid.position.y=-.07;scene.add(grid);
let opened=false,amount=0,currentOpen=0,currentAmount=0,touring=false,tourStart=0;
function sync(){ $('reveal').textContent=opened?'Close trunk':'Open trunk';$('reveal').setAttribute('aria-expanded',String(opened));$('explode').value=String(Math.round(amount*100));$('percent').textContent=Math.round(amount*100)+'%';$('tour').textContent=touring?'Stop tour':'Play tour';$('status').textContent=amount>0?'Equipment suspended · Drag to explore':opened?'Trunk open · Explore your setup':'Ready for the reveal';}
function stop(){touring=false;sync();}
$('reveal').onclick=()=>{stop();opened=!opened;if(!opened)amount=0;sync();};$('explode').oninput=e=>{stop();amount=Number(e.target.value)/100;if(amount>0)opened=true;sync();};
$('tour').onclick=()=>{touring=!touring;tourStart=performance.now();if(touring){opened=true;amount=0;}sync();};
$('reset').onclick=()=>{stop();opened=false;amount=0;camera.position.set(4.3,3.8,5.3);controls.target.set(0,.75,0);sync();};controls.addEventListener('start',()=>{if(touring)stop();});
const clock=new T.Clock();function frame(now){const dt=Math.min(clock.getDelta(),.05);if(touring){const t=(now-tourStart)/1000;opened=true;amount=t<2?0:t<5?(t-2)/3:t<10?1:t<13?1-(t-10)/3:0;if(!reduced){camera.position.set(Math.sin(.7+t*.22)*6,3.8,Math.cos(.7+t*.22)*6);}if(t>15){touring=false;opened=false;}sync();}const k=reduced?1:1-Math.exp(-dt*5);currentOpen+=(Number(opened)-currentOpen)*k;currentAmount+=(amount-currentAmount)*k;lid.rotation.x=-currentOpen*1.82;strip.intensity=currentOpen*7;for(const a of items){a.g.position.copy(a.home);a.g.position.y+=a.lift*currentAmount;a.g.position.x+=a.spread*currentAmount;}controls.update();renderer.render(scene,camera);}
renderer.setAnimationLoop(frame);document.addEventListener('visibilitychange',()=>{renderer.setAnimationLoop(document.hidden?null:frame);clock.getDelta();});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);$('status').textContent='3D view paused. Refresh to restore it.';});
if(new URLSearchParams(location.search).get('reveal')==='1')opened=true;sync();
