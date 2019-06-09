window.onload = () => {
  const fill = (char, num, string) => new Array(Math.max(0, num - string.length)).fill(char).join("") + string;
  const hex = (num, n, b = true) => `${b?'0x':''}${fill('0', n, num.toString(16).toUpperCase())}`;

  let interval = null;

  const step = (processor) => {
    const viewer = document.getElementById("container");
    viewer.height = 200;

    let html = "";

    let pc = processor.register_PC;
    for(let i = 0; i < 12; ++i){
      let instruction = processor.instruction(pc);
      let full_instruction = 0;
      for(let k = 0; k < instruction.length && !isFinite(instruction); ++k){
        full_instruction |= processor.memory[pc + k] << (k << 3);
      }

      let replacement = isFinite(instruction) ? "undefined" : instruction.name;
      replacement = replacement.replace(/\_/g, ' ');
      replacement = replacement.replace(/ D16/g, ' ' + hex(full_instruction >> 0x8, 4));
      replacement = replacement.replace(/ D8/g, ' ' + hex(full_instruction >> 0x8, 2));
      replacement = replacement.replace(/ PHL/g, " (HL)");
      replacement = replacement.replace(/ PDE/g, " (DE)");
      replacement = replacement.replace(/ PBC/g, " (BC)");
      replacement = replacement.replace(/ DHL/g, " (HL-)");
      replacement = replacement.replace(/ IHL/g, " (HL+)");

      html += `<div class="rows">` +
                  `<div class="offset">${ hex(pc, 4) }</div>` +
                  `<div class="memory">${ hex(full_instruction, 2) }</div>`+
                  `<div class="instruction">${replacement}</div>`+
               `</div>`;
     pc += isFinite(instruction) ? 1 : instruction.length;
    }
    viewer.innerHTML = html;

    // 8 bits Registers
    const bits_8 = document.querySelector("#registers > .tab_container").children[0];
    processor.register_8bits.forEach((e, i) => bits_8.children[1].children[i].innerHTML = hex(e, 2));

    // 16 bits Registers
    const bits_16 = document.querySelector("#registers > .tab_container").children[1];
    bits_16.children[1].children[0].innerHTML = hex(processor.register_BC, 4);
    bits_16.children[1].children[1].innerHTML = hex(processor.register_DE, 4);
    bits_16.children[1].children[2].innerHTML = hex(processor.register_HL, 4);
    bits_16.children[1].children[3].innerHTML = hex(processor.register_AF, 4);
    bits_16.children[1].children[4].innerHTML = hex(processor.register_PC, 4);
    bits_16.children[1].children[5].innerHTML = hex(processor.register_SP, 4);

    // Set Table Values
    const table_html = document.getElementById("hex-values");
    const pointer = processor.register_PC & ~0xF;
    let table = "";
    for(let i = 0; i < 16; ++i){
      let offset = pointer + i * 16;
      table += "<div class='row'>";
        table += `<div class='offset_table'>${hex(offset, 4)}</div>`;
        for(let j = 0; j < 16; ++j){
          table += `<div>${hex(processor.memory[offset + j], 2, false)}</div>`;
        }
      table += "</div>";
    }
    table_html.innerHTML = table;
    table_html.children[0].children[1 + (processor.register_PC & 0xF)].classList.add("current_hex");

    try{
      processor.cycle();
    }catch(e){
      console.error(e.message);
    }
  };

  const frame = (processor) => {
    try{
      /*let cycles_second = parseInt(document.getElementById("number_skip").value);
      for(let i = 0; i < cycles_second - 1; ++i){
        processor.cycle();
      }*/
      step(processor);
    }catch(e){
      console.error(e.message);
    }
  };

  const load_assembly = (memory_module) => {
    const processor = new Z80();
    processor.memory = new Uint16Array(0xFFFF);
    processor.memory.set(memory_module, processor.register_PC);
    step(processor);

    document.getElementById("step").onclick = (e) => step(processor);
    document.getElementById("play").onclick = function(e){
      if(!this.classList.contains("stop")){
        interval = requestAnimationFrame(() => frame(processor));
      }else{
        cancelAnimationFrame(interval);
      }
      this.classList.toggle("stop");
    };
  };

  document.getElementById("load-memory").onclick = function(){
    document.getElementById("file-loader").click();
  };

  document.getElementById("file-loader").onchange = function(file){
    if(this.files.length > 0){
      const reader = new FileReader();

      reader.onload = () => {
        load_assembly(new Uint8Array(reader.result));
      };

      reader.readAsArrayBuffer(this.files[0]);
    }
  };

  document.querySelectorAll("#registers > .tabs > div").forEach(e => {
    e.addEventListener("click", function(){
      document.querySelector("#registers > .tabs > div.selected").classList.remove("selected");
      this.classList.add("selected");

      const index = Array.from(this.parentNode.children).indexOf(this);
      document.querySelector("#registers > .tab_container > .hide").classList.remove("hide");
      Array.from(document.querySelector("#registers > .tab_container").children).forEach((e, i) => {
        if(index != i){
          e.classList.add("hide")
        }
      });

    });
  });
};
