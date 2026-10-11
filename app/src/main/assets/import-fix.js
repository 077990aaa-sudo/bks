(function(){
  'use strict';

  function normDigits(v){
    return String(v == null ? '' : v)
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  }

  function cleanCell(v){
    return String(v == null ? '' : v)
      .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'')
      .replace(/\u00a0/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function normHeader(v){
    return cleanCell(v).toLowerCase()
      .replace(/[أإآ]/g,'ا')
      .replace(/ة/g,'ه')
      .replace(/ى/g,'ي')
      .replace(/[ـًٌٍَُِّْ]/g,'')
      .replace(/\s+/g,' ');
  }

  function cleanName(v){
    let x=cleanCell(v);
    x=x.replace(/^\s*[\d٠-٩۰-۹]+\s*[\-–—.)،,:ـ\/\\]+\s*/,'');
    x=x.replace(/^\s*(?:ت|م|الطالب|الطالبة|اسم الطالب|اسم الطالبة)\s*[:\-–—]*\s*/i,'');
    x=x.replace(/\s*[|;،]+\s*$/,'').replace(/\s+/g,' ').trim();
    return x;
  }

  function isPhone(v){
    const d=normDigits(v).replace(/\D/g,'');
    return /^(?:964)?7\d{8,10}$/.test(d) || /^07\d{8,9}$/.test(d);
  }

  function isSerial(v){
    const x=normDigits(cleanCell(v));
    return /^\d{1,5}$/.test(x) || /^\d{1,5}[.)-]$/.test(x);
  }

  function nameScore(v){
    const x=cleanName(v);
    if(!x || isPhone(x) || isSerial(x)) return -10;
    const n=normHeader(x);
    if(/^(الصف|الماده|المادة|الشعبه|الشعبة|المرحله|المرحلة|الهاتف|الموبايل|الرقم|ت|م)$/.test(n)) return -8;
    if(/(الثالث|الثاني|الاول|الرابع|الخامس|السادس|المتوسط|الاعدادي|العلمي|الادبي)/.test(n)) return -5;
    const arabic=(x.match(/[\u0621-\u064A]/g)||[]).length;
    const tokens=x.split(/\s+/).filter(Boolean);
    const digits=(normDigits(x).match(/\d/g)||[]).length;
    if(arabic<2 || digits>2) return -4;
    let score=arabic/5;
    if(tokens.length>=2 && tokens.length<=6) score+=6;
    else if(tokens.length===1 && x.length>=3) score+=2;
    else if(tokens.length>8) score-=5;
    return score;
  }

  function headerScore(row){
    const joined=normHeader((row||[]).join(' '));
    let score=0;
    [
      ['اسم الطالب','اسم الطالبه','الاسم','الطالب'],
      ['الصف','المرحله','الشعبه'],
      ['الماده','المادة','الدرس'],
      ['ولي الامر','الاب'],
      ['الهاتف','الموبايل','واتساب','رقم الهاتف'],
      ['ملاحظات']
    ].forEach(g=>{if(g.some(x=>joined.includes(normHeader(x))))score++;});
    return score;
  }

  function findHeader(rows){
    let best=-1,bestScore=0;
    for(let i=0;i<Math.min(rows.length,12);i++){
      const sc=headerScore(rows[i]);
      if(sc>bestScore){best=i;bestScore=sc;}
    }
    return bestScore>=2?best:-1;
  }

  function detect(headers, words){
    const hs=(headers||[]).map(normHeader);
    for(let i=0;i<hs.length;i++){
      if(words.some(w=>hs[i].includes(normHeader(w)))) return i;
    }
    return -1;
  }

  function compact(rows){
    return (rows||[])
      .map(r=>(r||[]).map(cleanCell))
      .filter(r=>r.some(v=>v!==''));
  }

  function bestNameColumn(rows){
    const maxCols=Math.max(0,...rows.map(r=>r.length));
    let best=0,bestScore=-Infinity;
    for(let c=0;c<maxCols;c++){
      let total=0,count=0;
      rows.slice(0,60).forEach(r=>{
        if(c<r.length && cleanCell(r[c])){
          total+=nameScore(r[c]); count++;
        }
      });
      const avg=count?total/count:-99;
      if(avg>bestScore){bestScore=avg;best=c;}
    }
    return best;
  }

  function oneWordRatio(rows,c){
    let one=0,total=0;
    rows.slice(0,40).forEach(r=>{
      const x=cleanName(r[c]||'');
      if(x){total++; if(x.split(/\s+/).length===1 && nameScore(x)>0) one++;}
    });
    return total?one/total:0;
  }

  function chooseRange(rows,headers,nameI){
    let start=nameI>=0?nameI:bestNameColumn(rows),end=start;
    if(!headers.length && oneWordRatio(rows,start)>.65){
      for(const c of [start+1,start-1]){
        if(c<0) continue;
        const valid=rows.slice(0,30).filter(r=>nameScore(r[c]||'')>0).length;
        if(valid>=Math.max(3,Math.floor(rows.slice(0,30).length*.35))){
          end=c; break;
        }
      }
    }
    return {start,end};
  }

  function ensureUi(){
    const modal=document.getElementById('importStudentsModal');
    if(!modal || document.getElementById('importNameStartCol')) return;
    const grid=modal.querySelector('.form-grid');
    if(!grid) return;

    const wrap=document.createElement('div');
    wrap.className='full';
    wrap.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;border:1px solid rgba(255,216,77,.22);background:rgba(255,216,77,.06);border-radius:14px';
    wrap.innerHTML=
      '<label style="display:grid;gap:6px">بداية عمود الاسم<select id="importNameStartCol"><option value="auto">تلقائي ذكي</option></select></label>'+
      '<label style="display:grid;gap:6px">نهاية عمود الاسم<select id="importNameEndCol"><option value="same">نفس العمود</option></select></label>'+
      '<label class="switch" style="grid-column:1/-1"><input type="checkbox" id="importJoinNameCells" checked> دمج أجزاء الاسم المتجاورة والمحافظة على الاسم الكامل</label>'+
      '<div id="importNameHint" style="grid-column:1/-1;color:#ffe991;font-size:12px;line-height:1.7">الكشف تلقائي. إذا المعاينة مو صحيحة اختَر عمود الاسم يدويًا.</div>';
    grid.appendChild(wrap);

    document.getElementById('importNameStartCol').addEventListener('change',()=>window.applyStudentColumnMapping());
    document.getElementById('importNameEndCol').addEventListener('change',()=>window.applyStudentColumnMapping());
    document.getElementById('importJoinNameCells').addEventListener('change',()=>window.applyStudentColumnMapping());

    const help=modal.querySelector('.import-help');
    if(help) help.textContent='القراءة الذكية تنظف الترقيم وتبحث عن عمود الاسم العربي. إذا أخطأ الكشف، اختر بداية ونهاية أعمدة الاسم من الأعلى ثم راجع المعاينة قبل الإضافة.';
  }

  let rawRows=[];
  let detected={start:0,end:0};

  function updateSelectors(maxCols,start,end){
    ensureUi();
    const a=document.getElementById('importNameStartCol');
    const b=document.getElementById('importNameEndCol');
    if(!a||!b) return;
    const oldA=a.value,oldB=b.value;
    a.innerHTML='<option value="auto">تلقائي ذكي — المقترح عمود '+(start+1)+'</option>'+
      Array.from({length:maxCols},(_,i)=>'<option value="'+i+'">عمود '+(i+1)+'</option>').join('');
    b.innerHTML='<option value="same">نفس عمود البداية</option>'+
      Array.from({length:maxCols},(_,i)=>'<option value="'+i+'">حتى العمود '+(i+1)+'</option>').join('');
    a.value=(oldA!=='auto' && Number(oldA)<maxCols)?oldA:'auto';
    b.value=(oldB!=='same' && Number(oldB)<maxCols)?oldB:'same';
  }

  function buildStudents(){
    const all=compact(rawRows);
    if(!all.length) return [];
    const mode=document.getElementById('importHasHeader')?.value||'auto';
    let headerIndex=-1;
    if(mode==='yes') headerIndex=0;
    else if(mode==='auto') headerIndex=findHeader(all);

    const headers=headerIndex>=0?all[headerIndex]:[];
    const rows=headerIndex>=0?all.slice(headerIndex+1):all;
    if(!rows.length) return [];

    let nameI=-1,classI=-1,subjectI=-1,guardianI=-1,phoneI=-1,noteI=-1;
    if(headers.length){
      nameI=detect(headers,['اسم الطالب','اسم الطالبة','الاسم الثلاثي','الاسم الرباعي','الاسم','الطالب','الطالبة']);
      classI=detect(headers,['الصف','المرحله','المرحلة','الشعبه','الشعبة']);
      subjectI=detect(headers,['الماده','المادة','الدرس']);
      guardianI=detect(headers,['ولي الامر','اسم ولي الامر','الاب','الأب']);
      phoneI=detect(headers,['الهاتف','الموبايل','رقم الهاتف','رقم ولي الامر','تلفون','واتساب']);
      noteI=detect(headers,['ملاحظات','ملاحظه','الملاحظة']);
    }

    const auto=chooseRange(rows,headers,nameI);
    const maxCols=Math.max(1,...all.map(r=>r.length));
    updateSelectors(maxCols,auto.start,auto.end);

    const a=document.getElementById('importNameStartCol')?.value||'auto';
    const b=document.getElementById('importNameEndCol')?.value||'same';
    let start=a==='auto'?auto.start:Number(a);
    let end=b==='same'?start:Number(b);
    if(!Number.isFinite(start))start=auto.start;
    if(!Number.isFinite(end))end=start;
    const lo=Math.min(start,end),hi=Math.max(start,end);
    detected={start:lo,end:hi};

    const defClass=document.getElementById('importDefaultClass')?.value.trim()||'';
    const defSubject=document.getElementById('importDefaultSubject')?.value.trim()||'الرياضيات';
    const join=document.getElementById('importJoinNameCells')?.checked!==false;

    const out=rows.map((r,idx)=>{
      const parts=[];
      for(let c=lo;c<=hi;c++) if(cleanCell(r[c]||'')) parts.push(r[c]);
      let name=cleanName(join?parts.join(' '):(r[lo]||''));

      if(!name || isSerial(name) || nameScore(name)<0){
        const cand=r.map((v,c)=>({c,v:cleanName(v),score:nameScore(v)}))
          .filter(x=>x.score>0).sort((x,y)=>y.score-x.score);
        if(cand.length) name=cand[0].v;
      }
      if(!name || name.length<2 || headerScore([name])>=2) return null;

      let phone=phoneI>=0?(r[phoneI]||''):'';
      if(!phone){
        const pv=r.find(v=>isPhone(v));
        if(pv) phone=pv;
      }

      return {
        selected:true,
        sourceRow:idx+1+(headerIndex>=0?headerIndex+2:1),
        name:name,
        cls:(classI>=0?r[classI]:'')||defClass,
        subject:(subjectI>=0?r[subjectI]:'')||defSubject,
        guardian:(guardianI>=0?r[guardianI]:'')||'',
        phone:cleanCell(phone),
        note:(noteI>=0?r[noteI]:'')||'',
        _rawCells:[...r]
      };
    }).filter(Boolean);

    const hint=document.getElementById('importNameHint');
    if(hint) hint.textContent='تم اقتراح عمود الاسم: '+(lo+1)+(hi!==lo?' إلى '+(hi+1):'')+' — إذا الأسماء مو صحيحة غيّر الأعمدة.';
    return out;
  }

  window.normalizeHeader=normHeader;
  window.compactRows=compact;
  window.looksLikeHeader=function(row){return headerScore(row)>=2;};
  window.detectColumn=detect;

  window.rowsToStudents=function(rows){
    rawRows=compact(rows);
    ensureUi();
    return buildStudents();
  };

  window.applyStudentColumnMapping=function(){
    if(!rawRows.length) return;
    window.importedStudentRows=buildStudents();
    if(typeof window.renderImportPreview==='function') window.renderImportPreview();
    const st=document.getElementById('importStudentsStatus');
    if(st) st.textContent='تمت إعادة قراءة الملف: '+window.importedStudentRows.length+' اسمًا. راجع الأسماء قبل الإضافة.';
  };

  window.linesToStudents=function(lines){
    const defClass=document.getElementById('importDefaultClass')?.value.trim()||'';
    const defSubject=document.getElementById('importDefaultSubject')?.value.trim()||'الرياضيات';
    return (lines||[]).map(cleanCell).filter(x=>x&&x.length>1).map((line,i)=>{
      if(headerScore([line])>=2)return null;
      let phone='';
      const pm=line.match(/(?:\+?964|0)?7[\d٠-٩۰-۹]{8,10}/);
      if(pm){phone=pm[0];line=line.replace(pm[0],' ');}
      line=cleanName(line);
      if(!line||line.length<2)return null;
      return {selected:true,sourceRow:i+1,name:line,cls:defClass,subject:defSubject,guardian:'',phone,note:'',_rawCells:[line]};
    }).filter(Boolean);
  };

  window.parsePdfFile=async function(file){
    if(typeof pdfjsLib==='undefined') throw new Error('تعذر تحميل مكتبة PDF. تأكد من اتصال الإنترنت ثم أعد المحاولة.');
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const data=new Uint8Array(await file.arrayBuffer());
    const pdf=await pdfjsLib.getDocument({data}).promise;
    let allRows=[],totalItems=0;

    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p);
      const tc=await page.getTextContent();
      totalItems+=tc.items.length;
      const groups=[];
      tc.items.forEach(it=>{
        const text=cleanCell(it.str||'');
        if(!text)return;
        const x=it.transform?.[4]||0;
        const y=it.transform?.[5]||0;
        const width=Math.abs(it.width||0);
        const h=Math.abs(it.height||it.transform?.[0]||10);
        let g=groups.find(z=>Math.abs(z.y-y)<Math.max(3,h*.35));
        if(!g){g={y,items:[]};groups.push(g);}
        g.items.push({x,width,text});
      });
      groups.sort((x,y)=>y.y-x.y);
      for(const g of groups){
        const items=g.items.sort((x,y)=>y.x-x.x);
        if(!items.length)continue;
        const cells=[];
        let current=[items[0]],prev=items[0];
        for(let i=1;i<items.length;i++){
          const it=items[i];
          const gap=prev.x-(it.x+it.width);
          if(gap<22 && gap>-8) current.push(it);
          else {cells.push(current.map(z=>z.text).join(' '));current=[it];}
          prev=it;
        }
        cells.push(current.map(z=>z.text).join(' '));
        const cleaned=cells.map(cleanCell).filter(Boolean);
        if(cleaned.length) allRows.push(cleaned);
      }
    }
    if(totalItems<3) throw new Error('هذا الـ PDF يبدو مصورًا ولا يحتوي نصًا قابلًا للاستخراج. يحتاج OCR أولًا.');
    return allRows;
  };

  const oldClear=window.clearImportPreview;
  window.clearImportPreview=function(){
    rawRows=[];
    if(typeof oldClear==='function') oldClear();
    ensureUi();
    const a=document.getElementById('importNameStartCol'),b=document.getElementById('importNameEndCol');
    if(a)a.innerHTML='<option value="auto">تلقائي ذكي</option>';
    if(b)b.innerHTML='<option value="same">نفس العمود</option>';
    const hint=document.getElementById('importNameHint');
    if(hint)hint.textContent='الكشف تلقائي. إذا المعاينة مو صحيحة اختَر عمود الاسم يدويًا.';
  };

  const oldRender=window.renderImportPreview;
  if(typeof oldRender==='function'){
    window.renderImportPreview=function(){
      oldRender();
      if(rawRows.length){
        const st=document.getElementById('importStudentsStatus');
        if(st && !/عمود الاسم/.test(st.textContent)){
          st.textContent += ' — عمود الاسم المقترح: '+(detected.start+1)+(detected.end!==detected.start?' إلى '+(detected.end+1):'');
        }
      }
    };
  }

  ensureUi();
})();