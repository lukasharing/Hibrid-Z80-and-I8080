window.onload = () => {
  const fill = (char, num, string) => new Array(Math.max(0, num - string.length)).fill(char).join("") + string;
  const hex = (num, n) => `0x${fill('0', n, num.toString(16).toUpperCase())}`;
  const step = (processor, memory) => {
    const viewer = document.getElementById("container");
    viewer.height = 200;

    let html = "";

    let pc = processor.PC;
    for(let i = 0; i < 12; ++i){

      let instruction = processor.instruction_pointer[memory[pc]];
      let full_instruction = 0;
      for(let k = 0; k < instruction.length && !isFinite(instruction); ++k){
        full_instruction |= memory[pc + k] << (k << 3);
      }

      let replacement = isFinite(instruction) ? "undefined" : instruction.name;
      replacement = replacement.replace(/\_/g, ' ');
      replacement = replacement.replace(/ D16/g, ' ' + hex(full_instruction >> 0x8, 4));
      replacement = replacement.replace(/ D8/g, ' ' + hex(full_instruction >> 0x8, 2));
      replacement = replacement.replace(/ PHL/g, " (HL)");
      replacement = replacement.replace(/ DHL/g, " (HL-)");
      replacement = replacement.replace(/ IHL/g, " (HL+)");
      console.log(full_instruction & 0xff);

      html += `<div class="rows">` +
                  `<div class="offset">${ hex(pc, 4) }</div>` +
                  `<div class="memory">${ hex(full_instruction, 2) }</div>`+
                  `<div class="instruction">${replacement}</div>`+
               `</div>`;
     pc += isFinite(instruction) ? 1 : instruction.length;
    }
    viewer.innerHTML = html;

    console.log(document.querySelector("#registers > "));

    try{
      processor.cycle();
    }catch(e){
      console.error(e.message);
    }
  };

  const load_assembly = (memory_module) => {
    const processor = new Z80();
    processor.memory = memory_module;

    step(processor, memory_module);
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

};
