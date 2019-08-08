const processor = new Z80();

const fill = (char, num, string) => new Array(Math.max(0, num - string.length)).fill(char).join("") + string;
const hex = (num, n, b = true) => `${b?'0x':''}${fill('0', n, num.toString(16).toUpperCase())}`;

const visualize = _ => {
  const viewer = document.getElementById("instruction-container");
  viewer.height = 200;

  let pc = processor.register_PC;
  let num_instruction = (viewer.parentElement.clientHeight - 30) / 30;

  /* Visualize Instruction */
  // Create Table [offset | Opcode | value]
  let i = 0;
  let instruction_table = [];
  while(i < num_instruction){
    let instruction = processor.fetch_instruction(pc);
    let full_instruction = 0;
    for(let k = 0; k < instruction.length && !isFinite(instruction); ++k){
      full_instruction |= processor.memory[pc + k] << (k << 3);
    }

    let replacement = isFinite(instruction) ? "undefined" : instruction.name;
    replacement = replacement.replace(/\_/g, ' ');
    replacement = replacement.replace(/ D16/g, ' ' + hex(full_instruction >> 8, 4));
    replacement = replacement.replace(/ D8/g, ' ' + hex(full_instruction >> 8, 2));
    replacement = replacement.replace(/ PHL/g, " (HL)");
    replacement = replacement.replace(/ PDE/g, " (DE)");
    replacement = replacement.replace(/ PBC/g, " (BC)");
    replacement = replacement.replace(/ DHL/g, " (HL-)");
    replacement = replacement.replace(/ IHL/g, " (HL+)");

    instruction_table[i++] = {
      offset: pc,
      opcode: replacement,
      value: full_instruction
    };

    pc += instruction.length;
  }

  let html = "";
  // Iterate Over table
  let number_jumps = 0;
  for(let i = 0; i < num_instruction; ++i){
    let cell = instruction_table[i];
    let offset = parseInt(cell.offset);
    
    let jump_html = "";
    // Check if jump Instruction
    if(processor.is_jump_instruction(cell.value & 0xFF)){
      let jump_offset = offset + complement_two(cell.value >> 8, 8) + 2;

      let height_jump = -1;
      // Find Jump Offset
      for(let j = 0; j < instruction_table.length && height_jump < 0; ++j){
        height_jump = (instruction_table[j].offset === jump_offset) ? j : -1;
      }
      // Arrow Calculations
      let direction = jump_offset < offset;
      // Clamping
      height_jump = (height_jump < 0 && !direction ? num_instruction : height_jump) + (height_jump < 0) * (direction - 0.5);
      let bar_size = Math.abs(height_jump - i) * 30;
      jump_html = `<div class="arrow-jump jump-${direction ? "top" : "bottom"}" style="width: ${++number_jumps * 6}px; height: ${bar_size}px; top: ${-direction * bar_size + 15}px;"></div>`;
    }
    
    html +=`<div class="row">
              <div class="offset">${jump_html} ${ hex(offset, 4) }</div>
              <div class="opcode">${ hex(cell.value & 0xFF, 2) }</div>
              <div class="instruction">${ cell.opcode }</div>
            </div>`;
  }

  viewer.innerHTML = html;

  /* Visualize Instructions */
  // 8 bits Registers
  const bits_8 = document.querySelector("#registers > .tab_container > .table:first-child > .table_container > .row");
  processor.register_8bits.forEach((e, i) => bits_8.children[i].innerHTML = hex(e, 2));

  // 16 bits Registers
  const bits_16 = document.querySelector("#registers > .tab_container > .table:last-child > .table_container > .row");

  bits_16.children[0].innerHTML = hex(processor.register_BC, 4);
  bits_16.children[1].innerHTML = hex(processor.register_DE, 4);
  bits_16.children[2].innerHTML = hex(processor.register_HL, 4);
  bits_16.children[3].innerHTML = hex(processor.register_AF, 4);
  bits_16.children[4].innerHTML = hex(processor.register_PC, 4);
  bits_16.children[5].innerHTML = hex(processor.register_SP, 4);

  // Set Table Values
  const table_html = document.getElementById("hex-values");
  const pointer = processor.register_PC & ~0xF;
  let table = "";
  
  let num_memory_rows = (table_html.parentElement.parentElement.clientHeight - 51) / 30;
  for(let i = 0; i < num_memory_rows; ++i){
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

  /* Visualize Stack */
  const stack_html = document.getElementById("stack-values");
  let size_stack = Math.floor((stack_html.parentElement.parentElement.clientHeight - 51) / 30);
  let stack = "";

  let stack_offset = Math.max(0xFF80, processor.SP);
  let stack_offset_visible = Math.min(0xFFFE - size_stack, stack_offset);

  // We should look one after (i + 1).
  for(let i = 0; i < size_stack; ++i){
    let ostack = stack_offset_visible + i + 1;
    stack += `<div class="row ${(ostack === stack_offset) ? "stack-position" : ""}"><div>${hex(processor.memory[ostack], 2, false)}</div></div>`;
  }

  stack_html.innerHTML = stack;
};

const step = steps => {
  //try{
    /*let cycles_second = parseInt(document.getElementById("number_skip").value);
    for(let i = 0; i < cycles_second - 1; ++i){
      processor.cycle();
    }*/
    processor.cycle();
    visualize(processor);
  //}catch(e){
    console.error(e.message);
  //}
};


const load_assembly = (memory_module) => {
  processor.memory = new Uint16Array(0xFFFF);
  processor.memory.set(memory_module, processor.register_PC);
  visualize(processor);

  let interval = null;
  document.getElementById("step").onclick = (e) => step(processor);
  document.getElementById("play").onclick = function(e){
    if(!this.classList.contains("stop")){
      interval = requestAnimationFrame(_ => step(processor));
    }else{
      cancelAnimationFrame(interval);
    }
    this.classList.toggle("stop");
  };
};

document.getElementById("load-memory").onclick = _ => document.getElementById("file-loader").click();

document.getElementById("file-loader").onchange = function(){
  if(this.files.length === 0) return;
  
  const reader = new FileReader();
  reader.onload = _ => load_assembly(new Uint8Array(reader.result));
  reader.readAsArrayBuffer(this.files[0]);
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
