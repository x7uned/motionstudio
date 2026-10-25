"""Package generated poses only; never draw or synthesize character pixels.
Run with the bundled Codex Python (Pillow). Sources and the untouched original remain versioned.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import importlib.util, json, hashlib, subprocess, shutil
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/'data/characters/denis-story/v1'
W,H=192,208
STATES=['idle','wave','talk','explain','point','think','skeptical','surprised','sad','happy']
LABELS=['Спокойствие','Приветствие','Рассказывает','Объясняет','Обращает внимание','Размышляет','Сомневается','Удивляется','Сожалеет','Радуется']
spec=importlib.util.spec_from_file_location('pet_extract',Path.home()/'.codex/plugins/cache/openai-curated-remote/work-pets/0.1.6/skills/create-pet/scripts/extract_strip_frames.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
original=Image.open(D/'original/spritesheet.webp').convert('RGBA')
base=original.crop((0,0,W,H)); refbox=base.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox()
basefloor=refbox[3]
foot=base.crop((0,170,W,H)).getbbox();anchor=(foot[0]+foot[2])/2
atlas=Image.new('RGBA',(W*8,H*10)); rows={};qa={};catalog=[]
for row,(state,label) in enumerate(zip(STATES,LABELS)):
    frames=[]
    if state in ['idle','wave']:
        sr,count=(0,7) if state=='idle' else (3,4)
        frames=[original.crop((f*W,sr*H,(f+1)*W,(sr+1)*H)) for f in range(count)]
    else:
        source=D/'source'/('surprised-repair.png' if state=='surprised' else state+'.png')
        im=Image.open(source).convert('RGBA')
        # Generated alpha has low-alpha colored RGB noise. It is transport fringe, not artwork.
        im.putdata([(r,g,b,a) if a>16 else (0,0,0,0) for r,g,b,a in im.getdata()])
        groups=mod.component_frame_groups(im,6)
        if not groups or len(groups)!=6:raise ValueError(f'{state}: expected six separated sprites')
        boxes=[mod.component_bounds(g) for g in groups]
        scale=min((H-14)/max(b[3]-b[1] for b in boxes),(W-16)/max(b[2]-b[0] for b in boxes))
        for group,box in zip(groups,boxes):
            crop=mod.component_group_image(im,group,padding=0)
            foot=crop.crop((0,int(crop.height*.82),crop.width,crop.height)).getbbox()
            footx=(foot[0]+foot[2])/2
            resized=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
            cell=Image.new('RGBA',(W,H));cell.alpha_composite(resized,(round(anchor-footx*scale),basefloor-resized.height))
            if not cell.getbbox():raise ValueError('Empty frame')
            frames.append(cell)
        qa[state]={'source':str(source.relative_to(D)),'sourceSize':list(im.size),'sharedScale':scale,'frames':len(frames)}
    frame_dir=D/'frames'/state;frame_dir.mkdir(parents=True,exist_ok=True)
    bounds=[]
    for f,cell in enumerate(frames):
        cell.save(frame_dir/f'{f:02}.png');atlas.alpha_composite(cell,(f*W,row*H));bounds.append(cell.getbbox())
    for b in bounds:
        if min(b[0],b[1])<2 or b[2]>W-2 or b[3]>H-2:raise ValueError(f'{state}: clipped cell {b}')
    rows[state]=frames
    qa.setdefault(state,{}).update({'bounds':bounds,'baselineRange':max(b[3] for b in bounds)-min(b[3] for b in bounds),'distinctFrames':len(set(hashlib.sha256(x.tobytes()).hexdigest() for x in frames))})
    catalog.append({'id':state,'label':label,'row':row,'frames':len(frames),'fps':3 if state=='idle' else 4,'gifFrameDurationMs':320 if state=='idle' else 240,'playback':'ping-pong','file':f'previews/{state}.gif','use':next((x['meaning'] for x in json.loads((D/'motion-plan.json').read_text())['states'] if x['id']==state),'Спокойная исходная стойка' if state=='idle' else 'Короткое приветствие из оригинала')})
atlas.save(D/'spritesheet.png');atlas.save(D/'spritesheet.webp',lossless=True,exact=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(D/'catalog.json').write_text(json.dumps({'pack':'denis-story/v1','name':'Денис · рассказчик','petId':'pet_6abe1561305c8191b8b1cb9051053cad','cell':[W,H],'columns':8,'size':list(atlas.size),'sha256':sha(D/'spritesheet.webp'),'originalSha256':sha(D/'original/spritesheet.webp'),'states':catalog},ensure_ascii=False,indent=2))
(D/'validation.json').write_text(json.dumps({'structural':'pass','alpha':'cleaned <=16 on generated rows only','originalIdleUnchanged':all(rows['idle'][i].tobytes()==original.crop((i*W,0,(i+1)*W,H)).tobytes() for i in range(7)),'generatedFrames':48,'totalFrames':sum(len(f) for f in rows.values()),'states':qa},ensure_ascii=False,indent=2))
fontpath='/System/Library/Fonts/Supplemental/Arial.ttf'
font=ImageFont.truetype(fontpath,22);small=ImageFont.truetype(fontpath,16);title=ImageFont.truetype(fontpath,32)
# Native-cell contact sheet shows all poses in order with labels outside the atlas.
sheet=Image.new('RGB',(W*8+240,H*10+100),'#120C1D');draw=ImageDraw.Draw(sheet);draw.text((28,22),'ДЕНИС / ЭМОЦИИ РАССКАЗЧИКА',font=title,fill='#FDFEED')
for row,(state,label) in enumerate(zip(STATES,LABELS)):
    draw.text((20,116+row*H),label,font=font,fill='#E0CDF8');draw.text((20,148+row*H),state,font=small,fill='#959595')
    for f,cell in enumerate(rows[state]):sheet.paste(cell,(240+f*W,100+row*H),cell)
sheet.save(D/'previews/contact-sheet.png')
# Animated gallery: same pose samples as the original preview, played twice as slowly.
def gallery(t):
    canvas=Image.new('RGB',(1440,1080),'#120C1D');dr=ImageDraw.Draw(canvas)
    dr.text((48,32),'Денис · рассказчик',font=title,fill='#FDFEED');dr.text((48,76),'Оригинальная стойка + 8 новых реакций для истории',font=font,fill='#959595')
    for i,state in enumerate(STATES):
        x=24+(i%5)*284;y=136+(i//5)*450
        dr.rounded_rectangle((x,y,x+264,y+420),radius=16,fill='#1D1628',outline='#946ADE',width=1)
        frames=rows[state];phase=int(t*(3 if state=='idle' else 4))%(2*(len(frames)-1));index=phase if phase<len(frames) else 2*(len(frames)-1)-phase
        cell=frames[index].resize((288,312),Image.Resampling.NEAREST);canvas.paste(cell,(x-12,y+38),cell)
        dr.text((x+132,y+366),LABELS[i],font=font,fill='#FDFEED',anchor='mt');dr.text((x+132,y+397),state,font=small,fill='#959595',anchor='mt')
    return canvas
# A shared palette keeps colors stable throughout GIF playback.
preview=gallery(0);palette=preview.quantize(colors=256)
gallery_frames=[gallery(f/15) for f in range(90)]
gallery_frames[0].save(D/'previews/emotions.png')
g=[x.quantize(palette=palette,dither=Image.Dither.NONE) for x in gallery_frames]
g[0].save(D/'previews/emotions.gif',save_all=True,append_images=g[1:],duration=[60,60,80]*30,loop=0,optimize=False,disposal=2)
for i,state in enumerate(STATES):
    frames=rows[state];seq=frames+list(reversed(frames[1:-1]));out=[]
    for cell in seq:
        canvas=Image.new('RGB',(384,480),'#120C1D');canvas.paste(cell.resize((384,416),Image.Resampling.NEAREST),(0,24),cell.resize((384,416),Image.Resampling.NEAREST));ImageDraw.Draw(canvas).text((192,452),LABELS[i],font=font,fill='#FDFEED',anchor='mm');out.append(canvas)
    # GIF stores centiseconds: double the previous encoded 160/120 ms holds exactly.
    out[0].save(D/f'previews/{state}.gif',save_all=True,append_images=out[1:],duration=320 if state=='idle' else 240,loop=0)
# PNG gallery frames are disposable encode inputs, safe to rebuild.
video=D/'previews/gallery-frames';video.mkdir(exist_ok=True)
for f,im in enumerate(gallery_frames):im.save(video/f'{f:03}.png')
subprocess.run([str(ROOT/'bin/ffmpeg'),'-y','-v','error','-framerate','15','-i',str(video/'%03d.png'),'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t','6','-map','0:v:0','-map','1:a:0','-c:v','libx264','-profile:v','high','-crf','18','-pix_fmt','yuv420p','-r','30','-vf','tpad=stop_mode=clone:stop_duration=0.1,scale=out_color_matrix=bt709:out_range=tv','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-b:a','128k','-movflags','+faststart',str(D/'previews/emotions.mp4')],check=True)
shutil.rmtree(video)
print(json.dumps({'sha256':sha(D/'spritesheet.webp'),'frames':sum(map(len,rows.values())),'states':len(rows),'originalIdleUnchanged':True}))
