
/* Research */
// https://gbdev.gg8.se/wiki/articles/Gameboy_Bootstrap_ROM (BIOS)
// http://marc.rawer.de/Gameboy/Docs/GBCPUman.pdf
// https://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html
// http://gameboy.mongenel.com/dmg/asmmemmap.html


const change_bit_position = (b, n, v) => { return b ^= (-v ^ b) & (1 << n); };
// Complement's 2 (Signed 8bit number)
const complement_two = (n, b) => n - ((n >= (1 << (b - 1))) << b);

const BITS_ADDRESS = 8, HALF_ADDRESS = BITS_ADDRESS >> 1;
const ADDRESS_MASK = (1 << BITS_ADDRESS) - 1, HALF_ADDRESS_MASK = (1 << HALF_ADDRESS) - 1;


class Z80{
  constructor(){

    // 16 bits
    this.SP = 0x0000; // Stack Pointer (Default = 0xFFFE, Last Stack Memory Offset)
    this.PC = 0x0000; // Program Counter (Default = 0x0100, Cartridge Header Area)

    // Byte Register
    this.register_8bits = new Uint8Array([
      0b00000000, /* 000 - 0 -> B (GP) Also Used as Counter*/
      0b00000000, /* 001 - 1 -> C (Counter)*/
      0b00000000, /* 010 - 2 -> D (GP)*/
      0b00000000, /* 011 - 3 -> E (GP) */
      0b00000000, /* 100 - 4 -> H (Pointer) Indirect Addressing */
      0b00000000, /* 101 - 5 -> L (Pointer) Indirect Addressing */
      0b00000000, /* 110 - 7 -> A (Accumulator) */
      0b00000000, /* 111 - 6 -> F (Status Flag) - Read - No Write */
    ]);
    this.register_bit_B = 0x0;
    this.register_bit_C = 0x1;
    this.register_bit_D = 0x2;
    this.register_bit_E = 0x3;
    this.register_bit_H = 0x4;
    this.register_bit_L = 0x5;
    this.register_bit_A = 0x6;
    this.register_bit_F = 0x7;

    // CPU Frequency
    // 4.19 * 10^6 Hz or 8.38 * 10^6 Hz
    // Hz = 1 cycle / second.
    // 4.190.000 cycles / second
    this.frequency =  4.19e6; // cycles / second
    this.cycles_per_second = this.frequency / 60;
    this.cycles = 0;

    /*
      Source: http://gameboy.mongenel.com/dmg/asmmemmap.html

      Memory Map
      0x0000 - 0x00FF   -> Restart and Interrupt Vectors.
      0x0100 - 0x014F   -> Cartridge Header Area.
      Cartridge ROM:
        0x0150 - 0x3FFF -> Bank 0 (Fixed)
        0x4000 - 0x7FFF -> Swithable Banks
      0x8000 - 0x97FF   -> Character RAM
      BG MAP:
        0x9800 - 0x9BFF -> Data 1
        0x9C00 - 0x9FFF -> Data 2
      0xA000 - 0xBFFF   -> Cartridge RAM (If Available)
      Internal RAM:
        0xC000 - 0xCFFF -> Bank 0
        0xD000 - 0xDFFF -> Bank 1..7 (Swithable CGB)
      0xE000 - 0xFDFF   -> Echo RAM (Reserved, Do Not Use)
      -------------- Not Named
        0xFE00 - 0xFE9F -> OAM (Object Attribute Memory)
        0xFEA0 - 0xFEFF -> Unusable Memory
        0xFF00 - 0xFF7F -> Hardware I/O Registers (LDH Call These Special Functions)
        0xFF80 - 0xFFFE -> Zero Page - 127 Bytes
        0xFFFF - 0xFFFF -> Interrupt Enable Flag

      (Total 0x10000 Memory Offsets).
    */

    this.memory = null;

    // First level instruction table
    let i = this;
    this.instruction_pointer = new Array(
      i.NOP     , i.LD_BC_D16, i.LD_PBC_A , i.INC_BC  , i.INC_B      , i.DEC_B   , i.LD_B_D8  , i.RLCA    , i.LD_D16_SP , i.ADD_HL_BC, i.LD_A_PBC , i.DEC_BC , i.INC_C     , i.DEC_C   , i.LD_C_D8  , i.RRCA   ,
      i.STOP    , i.LD_DE_D16, i.LD_PDE_A , i.INC_DE  , i.INC_D      , i.DEC_D   , i.LD_D_D8  , i.RLA     , i.JR_D8     , i.ADD_HL_DE, i.LD_A_PDE , i.DEC_DE , i.INC_E     , i.DEC_E   , i.LD_E_D8  , i.RRA    ,
      i.JRNZ_D8 , i.LD_HL_D16, i.LD_IHL_A , i.INC_HL  , i.INC_H      , i.DEC_H   , i.LD_H_D8  , i.DAA     , i.JRZ_D8    , i.ADD_HL_HL, i.LD_A_IHL , i.DEC_HL , i.INC_L     , i.DEC_L   , i.LD_L_D8  , i.CPL    ,
      i.JRNC_D8 , i.LD_SP_D16, i.LD_DHL_A , i.INC_SP  , i.INC_PHL    , i.DEC_PHL , i.LD_PHL_D8, i.SCF     , i.JRC_D8    , i.ADD_HL_SP, i.LD_A_DHL , i.DEC_SP , i.INC_A     , i.DEC_A   , i.LD_A_D8  , i.CCF    ,
      i.LD_B_B  , i.LD_B_C   , i.LD_B_D   , i.LD_B_E  , i.LD_B_H     , i.LD_B_L  , i.LD_B_HL  , i.LD_B_A  , i.LD_B_B    , i.LD_C_C   , i.LD_C_D   , i.LD_C_E , i.LD_C_H    , i.LD_C_L  , i.LD_C_HL  , i.LD_C_A ,
      i.LD_D_B  , i.LD_D_C   , i.LD_D_D   , i.LD_D_E  , i.LD_D_H     , i.LD_D_L  , i.LD_D_HL  , i.LD_D_A  , i.LD_D_B    , i.LD_E_C   , i.LD_E_D   , i.LD_E_E , i.LD_E_H    , i.LD_E_L  , i.LD_E_HL  , i.LD_E_A ,
      i.LD_H_B  , i.LD_H_C   , i.LD_H_D   , i.LD_H_E  , i.LD_H_H     , i.LD_H_L  , i.LD_H_HL  , i.LD_H_A  , i.LD_H_B    , i.LD_L_C   , i.LD_L_D   , i.LD_L_E , i.LD_L_H    , i.LD_L_L  , i.LD_L_HL  , i.LD_L_A ,
      i.LD_PHL_B, i.LD_PHL_C , i.LD_PHL_D , i.LD_PHL_E, i.LD_PHL_H   , i.LD_PHL_L, i.HALT     , i.LD_PHL_A, i.LD_A_B    , i.LD_A_C   , i.LD_A_D   , i.LD_A_E , i.LD_A_H    , i.LD_A_L  , i.LD_A_HL  , i.LD_A_A ,
      i.ADD_A_B , i.ADD_A_C  , i.ADD_A_D  , i.ADD_A_E , i.ADD_A_H    , i.ADD_A_L , i.ADD_A_PHL, i.ADD_A_A , i.ADC_A_B   , i.ADC_A_C  , i.ADC_A_D  , i.ADC_A_E, i.ADC_A_H   , i.ADC_A_L , i.ADC_A_PHL, i.ADC_A_A,
      i.SUB_B   , i.SUB_C    , i.SUB_D    , i.SUB_E   , i.SUB_H      , i.SUB_L   , i.SUB_PHL  , i.SUB_A   , i.SBC_A_B   , i.SBC_A_C  , i.SBC_A_D  , i.SBC_A_E, i.SBC_A_H   , i.SBC_A_L , i.SBC_A_PHL, i.SBC_A_A,
      i.AND_B   , i.AND_C    , i.AND_D    , i.AND_E   , i.AND_H      , i.AND_L   , i.AND_PHL  , i.AND_A   , i.XOR_B     , i.XOR_C    , i.XOR_D    , i.XOR_E  , i.XOR_H     , i.XOR_L   , i.XOR_PHL  , i.XOR_A  ,
      i.OR_B    , i.OR_C     , i.OR_D     , i.OR_E    , i.OR_H       , i.OR_L    , i.OR_PHL   , i.OR_A    , i.CP_B      , i.CP_C     , i.CP_D     , i.CP_E   , i.CP_H      , i.CP_L    , i.CP_PHL   , i.CP_A   ,
      i.RET_NZ  , i.POP_BC   , i.JP_NZ_D16, i.JP_D16  , i.CALL_NZ_D16, i.PUSH_BC , i.ADD_A_D8 , i.RST_00H , i.RET_Z     , i.RET      , i.JP_Z_D16 , 0xCB     , i.CALL_Z_D16, i.CALL_D16, i.ADC_A_D8 , i.RST_08H,
      i.RET_NC  , i.POP_DE   , i.JP_NC_D16, 0xD3      , i.CALL_NC_D16, i.PUSH_DE , i.SUB_D8   , i.RST_10H , i.RET_C     , i.RETI     , i.JP_C_D16 , 0xDB     , i.CALL_C_D16, 0xDD      , i.SBC_A_D8 , i.RST_18H,
      i.LDH_A_D8, i.POP_HL   , i.LDH_C_A  , 0xE3      , 0xE4         , i.PUSH_HL , i.AND_D8   , i.RST_20H , i.ADD_SP_R8 , i.JP_HL    , i.LDH_D16_A, 0xEB     , 0xEC        , 0xED      , i.XOR_D8   , i.RST_28H,
      i.LDH_D8_A, i.POP_AF   , i.LDH_A_C  , i.DI      , 0xF4         , i.PUSH_AF , i.OR_D8    , i.RST_30H , i.LDHL_SP_HL, i.LD_SP_HL , i.LDH_A_D16, i.EI     , 0xFC        , 0xFD      , i.CP_D8    , i.RST_38H,
    );

    // Second level instruction table (0xCB ~ Prexif)
    this.instruction_cb = new Array(
      i.RLC_B  , i.RLC_C  , i.RLC_D  , i.RLC_E  , i.RLC_H  , i.RLC_L  , i.RLC_PHL  , i.RLC_A  , i.RRC_B  , i.RRC_C  , i.RRC_D  , i.RRC_E  , i.RRC_H  , i.RRC_L  , i.RRC_PHL  , i.RRC_A  ,
      i.RL_B   , i.RL_C   , i.RL_D   , i.RL_E   , i.RL_H   , i.RL_L   , i.RL_PHL   , i.RL_A   , i.RR_B   , i.RR_C   , i.RR_D   , i.RR_E   , i.RR_H   , i.RR_L   , i.RR_PHL   , i.RR_A   ,
      i.SLA_B  , i.SLA_C  , i.SLA_D  , i.SLA_E  , i.SLA_H  , i.SLA_L  , i.SLA_PHL  , i.SLA_A  , i.SRA_B  , i.SRA_C  , i.SRA_D  , i.SRA_E  , i.SRA_H  , i.SRA_L  , i.SRA_PHL  , i.SRA_A  ,
      i.SWAP_B , i.SWAP_C , i.SWAP_D , i.SWAP_E , i.SWAP_H , i.SWAP_L , i.SWAP_PHL , i.SWAP_A , i.SRL_B  , i.SRL_C  , i.SRL_D  , i.SRL_E  , i.SRL_H  , i.SRL_L  , i.SRL_PHL  , i.SRL_A  ,
      i.BIT_0_B, i.BIT_0_C, i.BIT_0_D, i.BIT_0_E, i.BIT_0_H, i.BIT_0_L, i.BIT_0_PHL, i.BIT_0_A, i.BIT_1_B, i.BIT_1_C, i.BIT_1_D, i.BIT_1_E, i.BIT_1_H, i.BIT_1_L, i.BIT_1_PHL, i.BIT_1_A,
      i.BIT_2_B, i.BIT_2_C, i.BIT_2_D, i.BIT_2_E, i.BIT_2_H, i.BIT_2_L, i.BIT_2_PHL, i.BIT_2_A, i.BIT_3_B, i.BIT_3_C, i.BIT_3_D, i.BIT_3_E, i.BIT_3_H, i.BIT_3_L, i.BIT_3_PHL, i.BIT_3_A,
      i.BIT_4_B, i.BIT_4_C, i.BIT_4_D, i.BIT_4_E, i.BIT_4_H, i.BIT_4_L, i.BIT_4_PHL, i.BIT_4_A, i.BIT_5_B, i.BIT_5_C, i.BIT_5_D, i.BIT_5_E, i.BIT_5_H, i.BIT_5_L, i.BIT_5_PHL, i.BIT_5_A,
      i.BIT_6_B, i.BIT_6_C, i.BIT_6_D, i.BIT_6_E, i.BIT_6_H, i.BIT_6_L, i.BIT_6_PHL, i.BIT_6_A, i.BIT_7_B, i.BIT_7_C, i.BIT_7_D, i.BIT_7_E, i.BIT_7_H, i.BIT_7_L, i.BIT_7_PHL, i.BIT_7_A,
      i.RES_0_B, i.RES_0_C, i.RES_0_D, i.RES_0_E, i.RES_0_H, i.RES_0_L, i.RES_0_PHL, i.RES_0_A, i.RES_1_B, i.RES_1_C, i.RES_1_D, i.RES_1_E, i.RES_1_H, i.RES_1_L, i.RES_1_PHL, i.RES_1_A,
      i.RES_2_B, i.RES_2_C, i.RES_2_D, i.RES_2_E, i.RES_2_H, i.RES_2_L, i.RES_2_PHL, i.RES_2_A, i.RES_3_B, i.RES_3_C, i.RES_3_D, i.RES_3_E, i.RES_3_H, i.RES_3_L, i.RES_3_PHL, i.RES_3_A,
      i.RES_4_B, i.RES_4_C, i.RES_4_D, i.RES_4_E, i.RES_4_H, i.RES_4_L, i.RES_4_PHL, i.RES_4_A, i.RES_5_B, i.RES_5_C, i.RES_5_D, i.RES_5_E, i.RES_5_H, i.RES_5_L, i.RES_5_PHL, i.RES_5_A,
      i.RES_6_B, i.RES_6_C, i.RES_6_D, i.RES_6_E, i.RES_6_H, i.RES_6_L, i.RES_6_PHL, i.RES_6_A, i.RES_7_B, i.RES_7_C, i.RES_7_D, i.RES_7_E, i.RES_7_H, i.RES_7_L, i.RES_7_PHL, i.RES_7_A,
      i.SET_0_B, i.SET_0_C, i.SET_0_D, i.SET_0_E, i.SET_0_H, i.SET_0_L, i.SET_0_PHL, i.SET_0_A, i.SET_1_B, i.SET_1_C, i.SET_1_D, i.SET_1_E, i.SET_1_H, i.SET_1_L, i.SET_1_PHL, i.SET_1_A,
      i.SET_2_B, i.SET_2_C, i.SET_2_D, i.SET_2_E, i.SET_2_H, i.SET_2_L, i.SET_2_PHL, i.SET_2_A, i.SET_3_B, i.SET_3_C, i.SET_3_D, i.SET_3_E, i.SET_3_H, i.SET_3_L, i.SET_3_PHL, i.SET_3_A,
      i.SET_4_B, i.SET_4_C, i.SET_4_D, i.SET_4_E, i.SET_4_H, i.SET_4_L, i.SET_4_PHL, i.SET_4_A, i.SET_5_B, i.SET_5_C, i.SET_5_D, i.SET_5_E, i.SET_5_H, i.SET_5_L, i.SET_5_PHL, i.SET_5_A,
      i.SET_6_B, i.SET_6_C, i.SET_6_D, i.SET_6_E, i.SET_6_H, i.SET_6_L, i.SET_6_PHL, i.SET_6_A, i.SET_7_B, i.SET_7_C, i.SET_7_D, i.SET_7_E, i.SET_7_H, i.SET_7_L, i.SET_7_PHL, i.SET_7_A,
    );

    this.short_jump_instructions = [0x20, 0x30, 0xD2, 0xE9, 0x18, 0x28, 0x38];
    this.long_jump_instruction = [0xCD, 0xDC, 0xCC, 0xD4, 0xC4, 0xCA, 0xDA, 0xC3, 0xC2];
    this.return_instruction = [0xC0, 0xC8, 0xC9, 0xD0, 0xD8, 0xD9];
  };

  is_jump_instruction(instruction){ return (this.is_short_jump_instruction(instruction) || this.is_long_jump_instruction(instruction)); };
  is_short_jump_instruction(instruction){ return (this.short_jump_instructions.indexOf(instruction) >= 0) };
  is_long_jump_instruction(instruction){ return (this.long_jump_instruction.indexOf(instruction) >= 0); }
  is_return_instruction(instruction){ return (this.return_instruction.indexOf(instruction) >= 0); }

  /* UNIMPLEMENTED INSTRUCTION SET */

  SUB_B(op){ throw "Unimplemented Instruction"; return 4; };
  SUB_C(op){ throw "Unimplemented Instruction"; return 4; };
  SUB_D(op){ throw "Unimplemented Instruction"; return 4; };
  SUB_E(op){ throw "Unimplemented Instruction"; return 4; };
  SUB_H(op){ throw "Unimplemented Instruction"; return 4; };
  SUB_L(op){ throw "Unimplemented Instruction"; return 4; };
  SUB_PHL(op, r1){ throw "Unimplemented Instruction"; return 4; };
  SUB_A(op){ throw "Unimplemented Instruction"; return 4; };
  SUB_D8(op, r1){ throw "Unimplemented Instruction"; return 4; };

  SBC_B(op, r1){ throw "Unimplemented Instruction"; return 4; };
  SBC_C(op, r1){ throw "Unimplemented Instruction"; return 4;};
  SBC_D(op, r1){ throw "Unimplemented Instruction"; return 4; };
  SBC_E(op, r1){ throw "Unimplemented Instruction"; return 4; };
  SBC_H(op, r1){ throw "Unimplemented Instruction"; return 4; };
  SBC_L(op, r1){ throw "Unimplemented Instruction"; return 4; };
  SBC_PHL(op, r1){ throw "Unimplemented Instruction"; return 8; };
  SBC_A(op, r1){ throw "Unimplemented Instruction"; return 4; };

  
  RLCA(op){ throw "Unimplemented Instruction"; };
  DAA(op){ throw "Unimplemented Instruction"; };

  // ------------ INSTRUCTIONS ----------------------------
  fetch_instruction(pc = this.PC){
    // Special Instruction
    let instruction_set = this.instruction_pointer;
    let memory = this.memory[pc];
    if(memory == 0xCB){ // Switch to second level table
      ++pc;
      instruction_set = this.instruction_cb;
    }
    memory = this.memory[pc];
    // Return Normal instruction
    return {instruction: instruction_set[memory], hexadecimal: memory};
  };

  // ------------ REGISTERS ----------------------------
  /* Instruction Register */
  get instruction_register(){ return this.memory[this.PC]; };

  /* Getter/Setter 8 bits Register */
  get register_A(){ return this.register_8bits[this.register_bit_A]; };
  get register_B(){ return this.register_8bits[this.register_bit_B]; };
  get register_C(){ return this.register_8bits[this.register_bit_C]; };
  get register_D(){ return this.register_8bits[this.register_bit_D]; };
  get register_E(){ return this.register_8bits[this.register_bit_E]; };
  get register_F(){ return this.register_8bits[this.register_bit_F]; };
  get register_H(){ return this.register_8bits[this.register_bit_H]; };
  get register_L(){ return this.register_8bits[this.register_bit_L]; };

  set register_A(_v){ this.register_8bits[this.register_bit_A] = _v & ADDRESS_MASK; };
  set register_B(_v){ this.register_8bits[this.register_bit_B] = _v & ADDRESS_MASK; };
  set register_C(_v){ this.register_8bits[this.register_bit_C] = _v & ADDRESS_MASK; };
  set register_D(_v){ this.register_8bits[this.register_bit_D] = _v & ADDRESS_MASK; };
  set register_E(_v){ this.register_8bits[this.register_bit_E] = _v & ADDRESS_MASK; };
  set register_F(_v){ this.register_8bits[this.register_bit_F] = _v & ADDRESS_MASK; };
  set register_H(_v){ this.register_8bits[this.register_bit_H] = _v & ADDRESS_MASK; };
  set register_L(_v){ this.register_8bits[this.register_bit_L] = _v & ADDRESS_MASK; };

  /* Shared register 16 bits */
  get register_HL(){ return ((this.register_H << 0x8) | this.register_L); };
  get register_BC(){ return ((this.register_B << 0x8) | this.register_C); };
  get register_DE(){ return ((this.register_D << 0x8) | this.register_E); };
  get register_AF(){ return ((this.register_A << 0x8) | this.register_F); };
  get register_SP(){ return this.SP; };
  get register_PC(){ return this.PC; };

  // HL is the only used inmediately in instructions.
  set register_HL(_v){ this.register_H = _v >> BITS_ADDRESS; this.register_L = _v & ADDRESS_MASK; };
  set register_BC(_v){ this.register_B = _v >> BITS_ADDRESS; this.register_C = _v & ADDRESS_MASK; };
  set register_DE(_v){ this.register_D = _v >> BITS_ADDRESS; this.register_E = _v & ADDRESS_MASK; };
  set register_AF(_v){ this.register_A = _v >> BITS_ADDRESS; this.register_F = _v & ADDRESS_MASK; };

  /* Flags (F Register 8 bits)
    Bit 0 -> 0
    Bit 1 -> 0
    Bit 2 -> 0
    Bit 3 -> 0
    Bit 4 -> C (Carry Flag)
    Bit 5 -> H (Half-Carry Flag)
    Bit 6 -> N (Subtraction Flag)
    Bit 7 -> Z (Zero Flag)
  */
  /* Set Flags */
  get carry_flag(){ return ((this.register_F >> 4) & 0x1); };
  get half_carry_flag(){ return ((this.register_F >> 5) & 0x1); };
  get negative_flag(){ return ((this.register_F >> 6) & 0x1); };
  get zero_flag(){ return ((this.register_F >> 7) & 0x1); };



  // Set Carry Flag to V-value, (??)
  set carry_flag(v){ this.register_F = change_bit_position(this.register_F, 4, v); };

  // When doing an operation if there was a carried from bit 3 to bit 4.
  set half_carry_flag(v){ this.register_F = change_bit_position(this.register_F, 5, v); };

  // If the number is negative, then the flag is set.
  set negative_flag(v){ this.register_F = change_bit_position(this.register_F, 6, v); };

  // Set Zero flag if the operation results in a 0
  set zero_flag(v){ this.register_F = change_bit_position(this.register_F, 7, v); };

  // ------------ STACK ----------------------------
  push_stack_byte(byte){ this.memory[this.SP] = byte; this.SP -= 1; };
  push_stack_short(short){  this.push_stack_byte(short & 0xFF);  this.push_stack_byte(short >> 8); }; 

  pop_stack_byte(){ this.SP += 1; return this.memory[this.SP + 1]; };
  pop_stack_short(){ this.SP += 2; return ((this.memory[this.SP + 2] << 8) | this.memory[this.SP + 1]); };

  // ------------ INSTRUCTIONS ---------------------

  /* Miscellaneous */
  /* NOP (The machine does nothing) */
  NOP(op){};
  
  /* HALT (Freezes until interrupt occurs) */
  HALT(op){ throw "Unimplemented Instruction"; };
  
  /* STOP (Halt CPU and LCD until interrupt occurs) - SUPPOSED TO BE 10 00 (2 bytes long)*/
  STOP(op){ throw "Unimplemented Instruction"; };
  
  /* [E/D]I (Enable/Disable Interrupts After calling the instruction not at the moment) */
  EI(op){ throw "Unimplemented Instruction"; };
  DI(op){ throw "Unimplemented Instruction"; };

  /* Operations */
  /* Additions without carry */
  ADD_A_R(r1){
    let operation = this.register_A + r1;
    this.register_A      = operation & ADDRESS_MASK;
    this.negative_flag   = false;
    this.half_carry_flag = (operation >> (HALF_ADDRESS - 1)) & 1;
    this.carry_flag      = (operation >> (BITS_ADDRESS - 1)) & 1;
  };

  ADD_A_A(op)    { op.ADD_A_R(op, op.register_A);             return 4; };
  ADD_A_B(op)    { op.ADD_A_R(op, op.register_B);             return 4; };
  ADD_A_C(op)    { op.ADD_A_R(op, op.register_C);             return 4; };
  ADD_A_D(op)    { op.ADD_A_R(op, op.register_D);             return 4; };
  ADD_A_E(op)    { op.ADD_A_R(op, op.register_E);             return 4; };
  ADD_A_H(op)    { op.ADD_A_R(op, op.register_H);             return 4; };
  ADD_A_L(op)    { op.ADD_A_R(op, op.register_L);             return 4; };
  ADD_A_PHL(op)  { op.ADD_A_R(op, op.memory[op.register_HL]); return 8; };
  ADD_A_D8(op, n){ op.ADD_A_R(op, op.memory[n]);              return 8; };

  
  /* Additions with carry */
  ADC_A_R(r1){
    let operation = this.register_A + r1 + this.carry_flag;
    this.register_A      = operation & ADDRESS_MASK;
    this.negative_flag   = false;
    this.half_carry_flag = (operation >> (HALF_ADDRESS - 1)) & 1;
    this.carry_flag      = (operation >> (BITS_ADDRESS - 1)) & 1;
  };
  
  ADC_A_A(op)    { op.ADC_A_R(op, op.register_A);             return 4; };
  ADC_A_B(op)    { op.ADC_A_R(op, op.register_B);             return 4; };
  ADC_A_C(op)    { op.ADC_A_R(op, op.register_C);             return 4; };
  ADC_A_D(op)    { op.ADC_A_R(op, op.register_D);             return 4; };
  ADC_A_E(op)    { op.ADC_A_R(op, op.register_E);             return 4; };
  ADC_A_H(op)    { op.ADC_A_R(op, op.register_H);             return 4; };
  ADC_A_L(op)    { op.ADC_A_R(op, op.register_L);             return 4; };
  ADC_A_PHL(op)  { op.ADC_A_R(op, op.memory[op.register_HL]); return 8; };
  ADC_A_D8(op, n){ op.ADC_A_R(op, op.memory[n]);              return 8; };
  

  /* CPL (Complement A Register) */
  CPL(op){
    this.register_A = ~this.register_A & ADDRESS_MASK;
    this.negative_flag   = true;
    this.half_carry_flag = true;
  };

  /* CP Compare A r (Eq A - r) */
  CP_R(r1){
    this.zero_flag       = this.register_A == r1;
    this.carry_flag      = !this.zero_flag;
    this.half_carry_flag = (((this.register_A & 0x10) - (r1 & 0x10)) & 0x10) === 0x10;
    this.negative_flag   = 1;
  };

  CP_A(op)    { op.CP_R(op.register_A); };
  CP_B(op)    { op.CP_R(op.register_B); };
  CP_C(op)    { op.CP_R(op.register_C); };
  CP_D(op)    { op.CP_R(op.register_D); };
  CP_E(op)    { op.CP_R(op.register_E); };
  CP_H(op)    { op.CP_R(op.register_H); };
  CP_L(op)    { op.CP_R(op.register_L); };
  CP_PHL(op)  { op.CP_R(op.memory[op.register_HL]); };
  CP_D8(op, n){ op.CP_R(op.memory[n]); };

  /* SCF (Set Carry Flag) */
  SCF(op){
    op.negative_flag = 0;
    op.half_carry_flag = 0;
    op.carry_flag = 1;
  };

  /* CCF (Complement Carry Flag) */
  CCF(op){
    op.negative_flag = 0;
    op.half_carry_flag = 0;
    op.carry_flag ^= 1;
  };

  /*
    r = Register
    n = Number
    r8 = 8 bit signed data added to the program data.
    d8 = 1 Offset
    d16 = 2 Offsets
  */

  /* LOAD (LD) Instructions */
  /* LD A, register */
  LD_A_A(op){ op.register_A = op.register_A; };
  LD_A_B(op){ op.register_A = op.register_B; };
  LD_A_C(op){ op.register_A = op.register_C; };
  LD_A_D(op){ op.register_A = op.register_D; };
  LD_A_E(op){ op.register_A = op.register_E; };
  LD_A_H(op){ op.register_A = op.register_H; };
  LD_A_L(op){ op.register_A = op.register_L; };

  /* LD B, register */
  LD_B_A(op){ op.register_B = op.register_A; };
  LD_B_B(op){ op.register_B = op.register_B; };
  LD_B_C(op){ op.register_B = op.register_C; };
  LD_B_D(op){ op.register_B = op.register_D; };
  LD_B_E(op){ op.register_B = op.register_E; };
  LD_B_H(op){ op.register_B = op.register_H; };
  LD_B_L(op){ op.register_B = op.register_L; };

  /* LD C, register */
  LD_C_A(op){ op.register_C = op.register_A; };
  LD_C_B(op){ op.register_C = op.register_B; };
  LD_C_C(op){ op.register_C = op.register_C; };
  LD_C_D(op){ op.register_C = op.register_D; };
  LD_C_E(op){ op.register_C = op.register_E; };
  LD_C_H(op){ op.register_C = op.register_H; };
  LD_C_L(op){ op.register_C = op.register_L; };

  /* LD D, register */
  LD_D_A(op){ op.register_D = op.register_A; };
  LD_D_B(op){ op.register_D = op.register_B; };
  LD_D_C(op){ op.register_D = op.register_C; };
  LD_D_D(op){ op.register_D = op.register_D; };
  LD_D_E(op){ op.register_D = op.register_E; };
  LD_D_H(op){ op.register_D = op.register_H; };
  LD_D_L(op){ op.register_D = op.register_L; };

  /* LD E, register */
  LD_E_A(op){ op.register_E = op.register_A; };
  LD_E_B(op){ op.register_E = op.register_B; };
  LD_E_C(op){ op.register_E = op.register_C; };
  LD_E_D(op){ op.register_E = op.register_D; };
  LD_E_E(op){ op.register_E = op.register_E; };
  LD_E_H(op){ op.register_E = op.register_H; };
  LD_E_L(op){ op.register_E = op.register_L; };

  /* LD H, register */
  LD_H_A(op){ op.register_H = op.register_A; };
  LD_H_B(op){ op.register_H = op.register_B; };
  LD_H_C(op){ op.register_H = op.register_C; };
  LD_H_D(op){ op.register_H = op.register_D; };
  LD_H_E(op){ op.register_H = op.register_E; };
  LD_H_H(op){ op.register_H = op.register_H; };
  LD_H_L(op){ op.register_H = op.register_L; };

  /* LD L, register */
  LD_L_A(op){ op.register_L = op.register_A; };
  LD_L_B(op){ op.register_L = op.register_B; };
  LD_L_C(op){ op.register_L = op.register_C; };
  LD_L_D(op){ op.register_L = op.register_D; };
  LD_L_E(op){ op.register_L = op.register_E; };
  LD_L_H(op){ op.register_L = op.register_H; };
  LD_L_L(op){ op.register_L = op.register_L; };

  /* LD register, d8 */
  LD_A_D8(op, d8)  { op.register_A = d8;             return 8; };
  LD_B_D8(op, d8)  { op.register_B = d8;             return 8; };
  LD_C_D8(op, d8)  { op.register_C = d8;             return 8; };
  LD_D_D8(op, d8)  { op.register_D = d8;             return 8; };
  LD_E_D8(op, d8)  { op.register_E = d8;             return 8; };
  LD_H_D8(op, d8)  { op.register_H = d8;             return 8; };
  LD_L_D8(op, d8)  { op.register_L = d8;             return 8; };
  LD_PHL_D8(op, d8){ op.memory[op.register_HL] = d8; return 12; };

  /* LD register (HL) */
  LD_A_HL(op){ op.register_A = op.memory[op.register_HL]; return 8; };
  LD_B_HL(op){ op.register_B = op.memory[op.register_HL]; return 8; };
  LD_C_HL(op){ op.register_C = op.memory[op.register_HL]; return 8; };
  LD_D_HL(op){ op.register_D = op.memory[op.register_HL]; return 8; };
  LD_E_HL(op){ op.register_E = op.memory[op.register_HL]; return 8; };
  LD_H_HL(op){ op.register_H = op.memory[op.register_HL]; return 8; };
  LD_L_HL(op){ op.register_L = op.memory[op.register_HL]; return 8; };

  /* LD (HL) register */
  LD_PHL_A(op){ op.memory[op.register_HL] = op.register_A; return 8; };
  LD_PHL_B(op){ op.memory[op.register_HL] = op.register_B; return 8; };
  LD_PHL_C(op){ op.memory[op.register_HL] = op.register_C; return 8; };
  LD_PHL_D(op){ op.memory[op.register_HL] = op.register_D; return 8; };
  LD_PHL_E(op){ op.memory[op.register_HL] = op.register_E; return 8; };
  LD_PHL_H(op){ op.memory[op.register_HL] = op.register_H; return 8; };
  LD_PHL_L(op){ op.memory[op.register_HL] = op.register_L; return 8; };

  /* LDH n = register_a [Vice-versa]*/
  LDH_A_D8(op, n){ op.memory[0xFF00 | n] = op.register_A; return 12; };
  LDH_A_D8(op, n){ op.register_A = op.memory[0xFF00 | n]; return 12; };

  /* LD A memory[16bits] [Vice-versa] */
  LD_A_PBC(op){ op.register_A = op.memory[op.register_BC]; return 8; };
  LD_PBC_A(op){ op.memory[op.register_BC] = op.register_A; return 8; };
  LD_A_PDE(op){ op.register_A = op.memory[op.register_DE]; return 8; };
  LD_PDE_A(op){ op.memory[op.register_DE] = op.register_A; return 8; };

  /* LD A (HL-) (Load and Increment) [Vice-versa] */
  LD_A_IHL(op){
    op.register_A = op.memory[op.register_HL];
    op.register_HL = op.register_HL + 1;
    return 8;
  };
  LD_IHL_A(op){
    op.memory[op.register_HL] = op.register_A;
    op.register_HL = op.register_HL + 1;
    return 8;
  };

  /* LD A (HL-) (Load and Decrement) [Vice-versa] */
  LD_A_DHL(op){
    op.register_A = op.memory[op.register_HL];
    op.register_HL = op.register_HL - 1;
    return 8;
  };
  LD_DHL_A(op){
    op.memory[op.register_HL] = op.register_A;
    op.register_HL = op.register_HL - 1;
    return 8;
  };

  /////////// 16 bits instructions (SHORTS) ///////////
  /* LDH A D16 (Load to Hardware Registers) [Vice-versa] */
  LDH_A_D16(op, d8, d16){ op.register_A = op.memory[0xFF00 | (d8 | (d16 << 0x8))]; return 12; };
  LDH_D16_A(op, d8, d16){ op.memory[0xFF00 | (d8 | (d16 << 0x8))] = op.register_A; return 12; };

  /* LDH A (C) (Load to Hardware Registers) [Vice-versa] */
  LDH_A_C(op){ op.register_A = op.memory[0xFF00 | op.register_C]; return 8; };
  LDH_C_A(op){ op.memory[0xFF00 | op.register_C] = op.register_A; return 8; };

  /* LD short_register short (0 - 8 = d8, 8-16 = d16) */
  LD_BC_D16(op, d8, d16) { op.register_BC = d8 | (d16 << 0x8); return 12; };
  LD_DE_D16(op, d8, d16) { op.register_DE = d8 | (d16 << 0x8); return 12; };
  LD_HL_D16(op, d8, d16) { op.register_HL = d8 | (d16 << 0x8); return 12; };
  LD_AF_D16(op, d8, d16) { op.register_AF = d8 | (d16 << 0x8); return 12; };

  /* Load to Stack pointer offset*/
  LD_SP_D16(op, n, m){
    op.SP = (m << 0x8) | n;
    return 12;
  };
  LD_D16_SP(op, d8, d16){
    op.memory[d8] = op.SP >> 8;
    op.memory[d16] = op.SP & 0x8;
    return 12;
  };

  /* Load Hig Memory LD M[0xFF00 | D8] = A [Vice-versa] */
  LDH_A_D8(op, d8){ op.register_A = op.memory[0xFF00 | d8]; return 12; };
  LDH_D8_A(op, d8){ op.memory[0xFF00 | d8] = op.register_A; return 12; };

  /* LDHL SP r8 */
  // TODO: Is this right ? this.PC += r8
  LDHL_SP_R8(op, d8){
    let r8 = complement_two(d8, 8);
    let effective_address = op.SP + r8;
    op.register_HL = op.memory[effective_address];
    op.carry_flag = (effective_address & 0x100) === 0x100;
    op.half_carry_flag = (effective_address & 0x10) === 0x10;
    op.zero_flag = false;
    op.negative_flag = false;
    return 12;
  };

  /* SP <- HL */
  LD_SP_HL(op){ op.SP = op.register_HL; return 8; };

  /* PUSH Stack Instructions */
  PUSH_BC(op){ op.push_stack_short(op.register_BC); return 16; };
  PUSH_DE(op){ op.push_stack_short(op.register_DE); return 16; };
  PUSH_HL(op){ op.push_stack_short(op.register_HL); return 16; };
  PUSH_AF(op){ op.push_stack_short(op.register_AF); return 16; };

  /* POP Stack Instructions */
  POP_BC(op){ op.register_BC = op.pop_stack_short(); return 12; };
  POP_DE(op){ op.register_DE = op.pop_stack_short(); return 12; };
  POP_HL(op){ op.register_HL = op.pop_stack_short(); return 12; };
  POP_AF(op){ op.register_AF = op.pop_stack_short(); return 12; };

  /* Mathematical Instructions */
  // Increments instruction
  INC_R_FLAGS(value){
    this.negative_flag   = false;
    this.zero_flag       = (value === 0);
    this.half_carry_flag = (value & 0x10) === 0x10;
  };

  INC_A(op){ op.register_A = op.register_A + 1; op.INC_R_FLAGS(op.register_A); return 4; };
  INC_B(op){ op.register_B = op.register_B + 1; op.INC_R_FLAGS(op.register_B); return 4; };
  INC_C(op){ op.register_C = op.register_C + 1; op.INC_R_FLAGS(op.register_C); return 4; };
  INC_D(op){ op.register_D = op.register_D + 1; op.INC_R_FLAGS(op.register_D); return 4; };
  INC_E(op){ op.register_E = op.register_E + 1; op.INC_R_FLAGS(op.register_E); return 4; };
  INC_H(op){ op.register_H = op.register_H + 1; op.INC_R_FLAGS(op.register_H); return 4; };
  INC_L(op){ op.register_L = op.register_L + 1; op.INC_R_FLAGS(op.register_L); return 4; };
  INC_PHL(op){
    op.memory[op.register_HL] = op.memory[op.register_HL] + 1;
    INC_R_FLAGS(op.memory[op.register_HL]);
    return 12;
  };

  // Increments Short
  INC_BC(op){ op.register_BC = op.register_BC + 1; return 8; };
  INC_DE(op){ op.register_DE = op.register_DE + 1; return 8; };
  INC_HL(op){ op.register_HL = op.register_HL + 1; return 8; };
  INC_SP(op){ op.register_SP = op.register_SP + 1; return 8; };

  // Decrement instruction
  DEC_R_FLAGS(value){
    this.negative_flag   = true;
    this.zero_flag       = (value === 0);
    this.half_carry_flag = (value & 0x10) === 0x10;
  };

  DEC_A(op){ op.register_A = op.register_A - 1; op.DEC_R_FLAGS(op.register_A); };
  DEC_B(op){ op.register_B = op.register_B - 1; op.DEC_R_FLAGS(op.register_B); };
  DEC_C(op){ op.register_C = op.register_C - 1; op.DEC_R_FLAGS(op.register_C); };
  DEC_D(op){ op.register_D = op.register_D - 1; op.DEC_R_FLAGS(op.register_D); };
  DEC_E(op){ op.register_E = op.register_E - 1; op.DEC_R_FLAGS(op.register_E); };
  DEC_H(op){ op.register_H = op.register_H - 1; op.DEC_R_FLAGS(op.register_H); };
  DEC_L(op){ op.register_L = op.register_L - 1; op.DEC_R_FLAGS(op.register_L); };
  DEC_PHL(op){
    op.memory[op.register_HL] = op.memory[op.register_HL] + 1;
    DEC_R_FLAGS(op.memory[op.register_HL]);
  };

  // Increments Short
  DEC_BC(op){ op.register_BC = op.register_BC - 1; };
  DEC_DE(op){ op.register_DE = op.register_DE - 1; };
  DEC_HL(op){ op.register_HL = op.register_HL - 1; };
  DEC_SP(op){ op.register_SP = op.register_SP - 1; };

  
  // AND (A <- A & R)
  AND_R(op, r1){
    this.register_A      = r1 & this.register_A;
    this.zero_flag       = this.register_A === 0;
    this.carry_flag      = false;
    this.negative_flag   = false;
    this.half_carry_flag = true;
  };

  AND_A(op){ op.AND_R(op.register_A); return 4; };
  AND_B(op){ op.AND_R(op.register_B); return 4; };
  AND_C(op){ op.AND_R(op.register_C); return 4; };
  AND_D(op){ op.AND_R(op.register_D); return 4; };
  AND_E(op){ op.AND_R(op.register_E); return 4; };
  AND_H(op){ op.AND_R(op.register_H); return 4; };
  AND_L(op){ op.AND_R(op.register_L); return 8; };
  AND_PHL(op){ op.AND_R(op.memory[op.register_HL]); return 8; };

  // OR (A <- A | R)  
  OR_R(op, r1){
    this.register_A      = r1 | this.register_A;
    this.zero_flag       = this.register_A === 0;
    this.carry_flag      = false;
    this.negative_flag   = false;
    this.half_carry_flag = false;
  };

  OR_A(op){ op.OR_R(op.register_A); return 4; };
  OR_B(op){ op.OR_R(op.register_B); return 4; };
  OR_C(op){ op.OR_R(op.register_C); return 4; };
  OR_D(op){ op.OR_R(op.register_D); return 4; };
  OR_E(op){ op.OR_R(op.register_E); return 4; };
  OR_H(op){ op.OR_R(op.register_H); return 4; };
  OR_L(op){ op.OR_R(op.register_L); return 8; };
  OR_PHL(op){ op.OR_R(op.memory[op.register_HL]); return 8;  };

  // XOR (A <- R ^ A)
  XOR_R(r1){
    this.register_A      = r1 ^ this.register_A;
    this.zero_flag       = this.register_A === 0;
    this.carry_flag      = false;
    this.negative_flag   = false;
    this.half_carry_flag = false;
  };

  XOR_A(op){ op.XOR_R(op.register_A); return 4; };
  XOR_B(op){ op.XOR_R(op.register_B); return 4; };
  XOR_C(op){ op.XOR_R(op.register_C); return 4; };
  XOR_D(op){ op.XOR_R(op.register_D); return 4; };
  XOR_D(op){ op.XOR_R(op.register_D); return 4; };
  XOR_E(op){ op.XOR_R(op.register_E); return 4; };
  XOR_H(op){ op.XOR_R(op.register_H); return 4; };
  XOR_L(op){ op.XOR_R(op.register_L); return 4; };
  XOR_PHL(op){ op.XOR_R(op.memory[op.register_HL]); return 8; };
  XOR_D8(op, n){ op.XOR_R(op.memory[n]); return 8; };

  /* Return Instruction */
  RET(op){
    this.PC = this.pop_stack_short();
    return 8;
  };
  RETI(op){ // TODO: Enables Interrups 
    this.PC = this.pop_stack_short();
    return 8;
  };
  RET_NZ(op){ 
    if(!op.zero_flag) { op.RET(); }
    return 8;
  };
  RET_NC(op){
    if(!op.carry_flag){ op.RET(); }
    return 8;
  };
  RET_Z(op){
    if(op.zero_flag)  { op.RET(); }
    return 8;
  };
  RET_C(op){
    if(op.carry_flag) { op.RET(); }
    return 8;
  };

  /* JUMP Instructions */
  // Jump to NN
  JP_D16(op, d8, d16){
    this.PC = (d8 | (d16 << 8)) - 3; // Subtract 3 of opcode + short
  };

  // Jump to NN if Zero Flag is Unset
  JP_NZ_D16(op, d8, d16){
    if(op.zero_flag === 0){
      op.JP_D16(op, d8, d16);
    }
  };

  // Jump to NN if Zero Flag is Set
  JP_Z_D16(op, d8, d16){
    if(op.zero_flag === 1){
      op.JP_D16(op, d8, d16);
    }
  };

  // Jump to NN if Carry Flag is Unset
  JP_NC_D16(op, d8, d16){
    if(op.carry_flag === 0){
      op.JP_D16(op, d8, d16);
    }
  };

  // Jump if Carry Flag is Set to NN
  JP_C_D16(op, d8, d16){
    if(op.carry_flag === 1){
      op.JP_NN(op, d8, d16);
    }
  };

  // Jump to HL
  JP_HL(op){
    op.PC = op.register_HL - 1; // Remove 1 From Op
  };

  // Increment Program Counter.
  JR_D8(op, d8){
    op.PC += complement_two(d8, 8);
  };

  // Increment Program Counter if Zero Flag is Set
  JRNZ_D8(op, d8){
    if(op.zero_flag === 0){
      op.JR_D8(op, d8);
    }
  };

  // Increment Program Counter if Zero Flag
  JRZ_D8(op, d8){
    if(op.zero_flag === 1){
      op.JR_D8(op, d8);
    }
  };

  // Increment Program Counter  if Carry Flag
  JRNC_D8(op, d8){
    if(op.carry_flag === 0){
      op.JR_D8(op, d8);
    }
  };

  // Increment Program Counter if Carry Flag is Set
  JRC_D8(op, d8){
    if(op.carry_flag === 1){
      op.JR_D8(op, d8);
    }
  };

  /* CALL */
  CALL_D16(op, d8, d16){
    console.log(1);
    let offset_next_instruction = op.PC + 3;
    op.push_stack_short(offset_next_instruction);
    op.PC = (d8 | (d16 << 8)); // Subtract 2
  };

  // ------------ PREFIX - SECOND LEVEL TABLE --------------
  // Rotation Left through Carry Flag (hi = cf, lo = a6 a5 a4 a3 a2 a1 a0, cf = a7)
  RL_R(r1){
    let lo = r1 & ((1 << (BITS_ADDRESS - 1)) - 1);
    let hi = r1 >> (BITS_ADDRESS - 1);
    let rt = this.carry_flag | (lo << 1);
    this.negative_flag   = false;
    this.half_carry_flag = false;
    this.carry_flag      = hi;
    return rt;
  };

  RL_A(op, bc){ op.register_A = op.RL_R(op.register_A); return 8; };
  RL_B(op, bc){ op.register_B = op.RL_R(op.register_B); return 8; };
  RL_C(op, bc){ op.register_C = op.RL_R(op.register_C); return 8; };
  RL_D(op, bc){ op.register_D = op.RL_R(op.register_D); return 8; };
  RL_E(op, bc){ op.register_E = op.RL_R(op.register_E); return 8; };
  RL_H(op, bc){ op.register_H = op.RL_R(op.register_H); return 8; };
  RL_L(op, bc){ op.register_L = op.RL_R(op.register_L); return 8; };
  RL_PHL(op, bc){ op.register_PHL = op.RL_R(op.memory[op.register_HL]); return 16; };
  
  // Rotation Right through Carry Flag (hi = a7 a6 a5 a4 a3 a2 a1, lo = cf, cf = a0)
  RR_R(r1){
    let lo = r1 & 0x1;
    let hi = r1 >> 1;
    let rt = (lo << (BITS_ADDRESS - 1)) | this.carry_flag;
    this.negative_flag   = false;
    this.half_carry_flag = false;
    this.carry_flag      = lo;
    return rt;
  };

  RR_A(op, bc){ op.register_A = op.RR_R(op.register_A); return 8; };
  RR_B(op, bc){ op.register_B = op.RR_R(op.register_B); return 8; };
  RR_C(op, bc){ op.register_C = op.RR_R(op.register_C); return 8; };
  RR_D(op, bc){ op.register_D = op.RR_R(op.register_D); return 8; };
  RR_E(op, bc){ op.register_E = op.RR_R(op.register_E); return 8; };
  RR_H(op, bc){ op.register_H = op.RR_R(op.register_H); return 8; };
  RR_L(op, bc){ op.register_L = op.RR_R(op.register_L); return 8; };
  RR_PHL(op, bc){ op.register_PHL = op.RR_R(op.memory[op.register_HL]); return 16; };

  
  // Rotation Right through Carry Flag (hi = a7 a6 a5 a4 a3 a2 a1, lo = cf, cf = a0)
  RLA(op){ throw "Unimplemented Instruction"; };

  // Rotation Left Circular (hi = a7, lo = a6 a5 a4 a3 a2 a1 a0, cf = a7)
  RLC_R(r1){
    let lo = r1 & ((1 << (BITS_ADDRESS - 1)) - 1);
    let hi = r1 >> (BITS_ADDRESS - 1);
    let rt = hi | (lo << 1);
    this.zero_flag       = rt === 0;
    this.negative_flag   = false;
    this.half_carry_flag = false;
    this.carry_flag      = hi;
    return rt;
  };

  RLC_A(op, bc){ op.register_A = op.RLC_R(op.register_A); return 8; };
  RLC_B(op, bc){ op.register_B = op.RLC_R(op.register_B); return 8; };
  RLC_C(op, bc){ op.register_C = op.RLC_R(op.register_C); return 8; };
  RLC_D(op, bc){ op.register_D = op.RLC_R(op.register_D); return 8; };
  RLC_E(op, bc){ op.register_E = op.RLC_R(op.register_E); return 8; };
  RLC_H(op, bc){ op.register_H = op.RLC_R(op.register_H); return 8; };
  RLC_L(op, bc){ op.register_L = op.RLC_R(op.register_L); return 8; };
  RLC_PHL(op, bc){ op.register_PHL = op.RLC_R(op.memory[op.register_HL]); return 16; };

  // Rotation Right Circular (hi = a7 a6 a5 a4 a3 a2 a1, lo = a0, cf = a0)
  RRC_R(r1){
    let lo = r1 & 0x1;
    let hi = r1 >> 1;
    let rt = (lo << (BITS_ADDRESS - 1)) | hi;
    this.zero_flag       = rt === 0;
    this.negative_flag   = false;
    this.half_carry_flag = false;
    this.carry_flag      = lo;
    return rt;
  };

  RRC_A(op, bc){ op.register_A = op.RRC_R(op.register_A); return 8; };
  RRC_B(op, bc){ op.register_B = op.RRC_R(op.register_B); return 8; };
  RRC_C(op, bc){ op.register_C = op.RRC_R(op.register_C); return 8; };
  RRC_D(op, bc){ op.register_D = op.RRC_R(op.register_D); return 8; };
  RRC_E(op, bc){ op.register_E = op.RRC_R(op.register_E); return 8; };
  RRC_H(op, bc){ op.register_H = op.RRC_R(op.register_H); return 8; };
  RRC_L(op, bc){ op.register_L = op.RRC_R(op.register_L); return 8; };
  RRC_PHL(op, bc){ op.register_PHL = op.RRC_R(op.memory[op.register_HL]); return 16; };

  // Swap halves of register
  SWAP_R(r1){
    let half_1 = r1 & HALF_ADDRESS_MASK;
    let half_2 = r1 >> HALF_ADDRESS;
    let result = (half_1 << (HALF_ADDRESS - 1)) | half_2;
    this.zero_flag       = result === 0;
    this.negative_flag   = false;
    this.half_carry_flag = false;
    this.carry_flag      = false;
    return result;
  };

  SWAP_A(op, bc){ this.register_A = op.SWAP_R(this.register_A); return 8; };
  SWAP_B(op, bc){ this.register_B = op.SWAP_R(this.register_B); return 8; };
  SWAP_C(op, bc){ this.register_C = op.SWAP_R(this.register_C); return 8; };
  SWAP_D(op, bc){ this.register_D = op.SWAP_R(this.register_D); return 8; };
  SWAP_E(op, bc){ this.register_E = op.SWAP_R(this.register_E); return 8; };
  SWAP_H(op, bc){ this.register_H = op.SWAP_R(this.register_H); return 8; };
  SWAP_L(op, bc){ this.register_L = op.SWAP_R(this.register_L); return 8; };
  SWAP_PHL(op, bc){ this.register_PHL = op.SWAP_R(this.register_PHL); return 16; };

  // Check nth-bit from register A, and set it accumulator bit on/off
  BIT_K_N(k, r1){
    this.zero_flag       = ~(r1 >> k) & 0x1;
    this.negative_flag   = false;
    this.half_carry_flag = true;
  };

  BIT_0_A(op, bc){ op.BIT_K_N(0, op.register_A); return 8; };
  BIT_0_B(op, bc){ op.BIT_K_N(0, op.register_B); return 8; };
  BIT_0_C(op, bc){ op.BIT_K_N(0, op.register_C); return 8; };
  BIT_0_D(op, bc){ op.BIT_K_N(0, op.register_D); return 8; };
  BIT_0_E(op, bc){ op.BIT_K_N(0, op.register_E); return 8; };
  BIT_0_H(op, bc){ op.BIT_K_N(0, op.register_H); return 8; };
  BIT_0_L(op, bc){ op.BIT_K_N(0, op.register_L); return 8; };
  BIT_0_PHL(op, bc){ op.BIT_K_N(0, op.memory[ op.register_HL]); return 16; };
  
  BIT_1_A(op, bc){ op.BIT_K_N(1, op.register_A); return 8; };
  BIT_1_B(op, bc){ op.BIT_K_N(1, op.register_B); return 8; };
  BIT_1_C(op, bc){ op.BIT_K_N(1, op.register_C); return 8; };
  BIT_1_D(op, bc){ op.BIT_K_N(1, op.register_D); return 8; };
  BIT_1_E(op, bc){ op.BIT_K_N(1, op.register_E); return 8; };
  BIT_1_H(op, bc){ op.BIT_K_N(1, op.register_H); return 8; };
  BIT_1_L(op, bc){ op.BIT_K_N(1, op.register_L); return 8; };
  BIT_1_PHL(op, bc){ op.BIT_K_N(1, op.memory[op.register_HL]); return 16; };

  BIT_2_A(op, bc)  { op.BIT_K_N(2, op.register_A); return 8; };
  BIT_2_B(op, bc)  { op.BIT_K_N(2, op.register_B); return 8; };
  BIT_2_C(op, bc)  { op.BIT_K_N(2, op.register_C); return 8; };
  BIT_2_D(op, bc)  { op.BIT_K_N(2, op.register_D); return 8; };
  BIT_2_E(op, bc)  { op.BIT_K_N(2, op.register_E); return 8; };
  BIT_2_H(op, bc)  { op.BIT_K_N(2, op.register_H); return 8; };
  BIT_2_L(op, bc)  { op.BIT_K_N(2, op.register_L); return 8; };
  BIT_2_PHL(op, bc){ op.BIT_K_N(2, op.memory[op.register_HL]); return 16; };

  BIT_3_A(op, bc)  { op.BIT_K_N(3, op.register_A); return 8; };
  BIT_3_B(op, bc)  { op.BIT_K_N(3, op.register_B); return 8; };
  BIT_3_C(op, bc)  { op.BIT_K_N(3, op.register_C); return 8; };
  BIT_3_D(op, bc)  { op.BIT_K_N(3, op.register_D); return 8; };
  BIT_3_E(op, bc)  { op.BIT_K_N(3, op.register_E); return 8; };
  BIT_3_H(op, bc)  { op.BIT_K_N(3, op.register_H); return 8; };
  BIT_3_L(op, bc)  { op.BIT_K_N(3, op.register_L); return 8; };
  BIT_3_PHL(op, bc){ op.BIT_K_N(3, op.memory[op.register_HL]); return 16; };

  BIT_4_A(op, bc)  { op.BIT_K_N(4, op.register_A); return 8; };
  BIT_4_B(op, bc)  { op.BIT_K_N(4, op.register_B); return 8; };
  BIT_4_C(op, bc)  { op.BIT_K_N(4, op.register_C); return 8; };
  BIT_4_D(op, bc)  { op.BIT_K_N(4, op.register_D); return 8; };
  BIT_4_E(op, bc)  { op.BIT_K_N(4, op.register_E); return 8; };
  BIT_4_H(op, bc)  { op.BIT_K_N(4, op.register_H); return 8; };
  BIT_4_L(op, bc)  { op.BIT_K_N(4, op.register_L); return 8; };
  BIT_4_PHL(op, bc){ op.BIT_K_N(4, op.memory[op.register_HL]); return 16; };

  BIT_5_A(op, bc)  { op.BIT_K_N(5, op.register_A); return 8; };
  BIT_5_B(op, bc)  { op.BIT_K_N(5, op.register_B); return 8; };
  BIT_5_C(op, bc)  { op.BIT_K_N(5, op.register_C); return 8; };
  BIT_5_D(op, bc)  { op.BIT_K_N(5, op.register_D); return 8; };
  BIT_5_E(op, bc)  { op.BIT_K_N(5, op.register_E); return 8; };
  BIT_5_H(op, bc)  { op.BIT_K_N(5, op.register_H); return 8; };
  BIT_5_L(op, bc)  { op.BIT_K_N(5, op.register_L); return 8; };
  BIT_5_PHL(op, bc){ op.BIT_K_N(5, op.memory[op.register_HL]); return 16; };

  BIT_6_A(op, bc)  { op.BIT_K_N(6, op.register_A); return 8; };
  BIT_6_B(op, bc)  { op.BIT_K_N(6, op.register_B); return 8; };
  BIT_6_C(op, bc)  { op.BIT_K_N(6, op.register_C); return 8; };
  BIT_6_D(op, bc)  { op.BIT_K_N(6, op.register_D); return 8; };
  BIT_6_E(op, bc)  { op.BIT_K_N(6, op.register_E); return 8; };
  BIT_6_H(op, bc)  { op.BIT_K_N(6, op.register_H); return 8; };
  BIT_6_L(op, bc)  { op.BIT_K_N(6, op.register_L); return 8; };
  BIT_6_PHL(op, bc){ op.BIT_K_N(6, op.memory[op.register_HL]); return 16; };

  BIT_7_A(op, bc)  { op.BIT_K_N(7, op.register_A); return 8; };
  BIT_7_B(op, bc)  { op.BIT_K_N(7, op.register_B); return 8; };
  BIT_7_C(op, bc)  { op.BIT_K_N(7, op.register_C); return 8; };
  BIT_7_D(op, bc)  { op.BIT_K_N(7, op.register_D); return 8; };
  BIT_7_E(op, bc)  { op.BIT_K_N(7, op.register_E); return 8; };
  BIT_7_H(op, bc)  { op.BIT_K_N(7, op.register_H); return 8; };
  BIT_7_L(op, bc)  { op.BIT_K_N(7, op.register_L); return 8; };
  BIT_7_PHL(op, bc){ op.BIT_K_N(7, op.memory[op.register_HL]); return 16; };

  // Set bit B in register R
  SET_0_A(){ this.register_A |= (0x1 << 0); return 8; };
  SET_0_B(){ this.register_B |= (0x1 << 0); return 8; };
  SET_0_C(){ this.register_C |= (0x1 << 0); return 8; };
  SET_0_D(){ this.register_D |= (0x1 << 0); return 8; };
  SET_0_E(){ this.register_E |= (0x1 << 0); return 8; };
  SET_0_H(){ this.register_H |= (0x1 << 0); return 8; };
  SET_0_L(){ this.register_L |= (0x1 << 0); return 8; };
  SET_0_PHL(){ this.register_PHL |= (0x1 << 0); return 16; };

  SET_1_A(){ this.register_A |= (0x1 << 1); return 8; };
  SET_1_B(){ this.register_B |= (0x1 << 1); return 8; };
  SET_1_C(){ this.register_C |= (0x1 << 1); return 8; };
  SET_1_D(){ this.register_D |= (0x1 << 1); return 8; };
  SET_1_E(){ this.register_E |= (0x1 << 1); return 8; };
  SET_1_H(){ this.register_H |= (0x1 << 1); return 8; };
  SET_1_L(){ this.register_L |= (0x1 << 1); return 8; };
  SET_1_PHL(){ this.register_PHL |= (0x1 << 1); return 16; };

  SET_2_A(){ this.register_A |= (0x1 << 2); return 8; };
  SET_2_B(){ this.register_B |= (0x1 << 2); return 8; };
  SET_2_C(){ this.register_C |= (0x1 << 2); return 8; };
  SET_2_D(){ this.register_D |= (0x1 << 2); return 8; };
  SET_2_E(){ this.register_E |= (0x1 << 2); return 8; };
  SET_2_H(){ this.register_H |= (0x1 << 2); return 8; };
  SET_2_L(){ this.register_L |= (0x1 << 2); return 8; };
  SET_2_PHL(){ this.register_PHL |= (0x1 << 2); return 16; };

  SET_3_A(){ this.register_A |= (0x1 << 3); return 8; };
  SET_3_B(){ this.register_B |= (0x1 << 3); return 8; };
  SET_3_C(){ this.register_C |= (0x1 << 3); return 8; };
  SET_3_D(){ this.register_D |= (0x1 << 3); return 8; };
  SET_3_E(){ this.register_E |= (0x1 << 3); return 8; };
  SET_3_H(){ this.register_H |= (0x1 << 3); return 8; };
  SET_3_L(){ this.register_L |= (0x1 << 3); return 8; };
  SET_3_PHL(){ this.register_PHL |= (0x1 << 3); return 16; };

  SET_4_A(){ this.register_A |= (0x1 << 4); return 8; };
  SET_4_B(){ this.register_B |= (0x1 << 4); return 8; };
  SET_4_C(){ this.register_C |= (0x1 << 4); return 8; };
  SET_4_D(){ this.register_D |= (0x1 << 4); return 8; };
  SET_4_E(){ this.register_E |= (0x1 << 4); return 8; };
  SET_4_H(){ this.register_H |= (0x1 << 4); return 8; };
  SET_4_L(){ this.register_L |= (0x1 << 4); return 8; };
  SET_4_PHL(){ this.register_PHL |= (0x1 << 4); return 16; };

  SET_5_A(){ this.register_A |= (0x1 << 5); return 8; };
  SET_5_B(){ this.register_B |= (0x1 << 5); return 8; };
  SET_5_C(){ this.register_C |= (0x1 << 5); return 8; };
  SET_5_D(){ this.register_D |= (0x1 << 5); return 8; };
  SET_5_E(){ this.register_E |= (0x1 << 5); return 8; };
  SET_5_H(){ this.register_H |= (0x1 << 5); return 8; };
  SET_5_L(){ this.register_L |= (0x1 << 5); return 8; };
  SET_5_PHL(){ this.register_PHL |= (0x1 << 5); return 16; };

  SET_6_A(){ this.register_A |= (0x1 << 6); return 8; };
  SET_6_B(){ this.register_B |= (0x1 << 6); return 8; };
  SET_6_C(){ this.register_C |= (0x1 << 6); return 8; };
  SET_6_D(){ this.register_D |= (0x1 << 6); return 8; };
  SET_6_E(){ this.register_E |= (0x1 << 6); return 8; };
  SET_6_H(){ this.register_H |= (0x1 << 6); return 8; };
  SET_6_L(){ this.register_L |= (0x1 << 6); return 8; };
  SET_6_PHL(){ this.register_PHL |= (0x1 << 6); return 16; };

  SET_7_A(){ this.register_A |= (0x1 << 7); return 8; };
  SET_7_B(){ this.register_B |= (0x1 << 7); return 8; };
  SET_7_C(){ this.register_C |= (0x1 << 7); return 8; };
  SET_7_D(){ this.register_D |= (0x1 << 7); return 8; };
  SET_7_E(){ this.register_E |= (0x1 << 7); return 8; };
  SET_7_H(){ this.register_H |= (0x1 << 7); return 8; };
  SET_7_L(){ this.register_L |= (0x1 << 7); return 8; };
  SET_7_PHL(){ this.register_PHL |= (0x1 << 7); return 16; };

  // Unset bit B in register R
  RES_0_A(){ this.register_A &= ~(0x1 << 0); return 8; };
  RES_0_B(){ this.register_B &= ~(0x1 << 0); return 8; };
  RES_0_C(){ this.register_C &= ~(0x1 << 0); return 8; };
  RES_0_D(){ this.register_D &= ~(0x1 << 0); return 8; };
  RES_0_E(){ this.register_E &= ~(0x1 << 0); return 8; };
  RES_0_H(){ this.register_H &= ~(0x1 << 0); return 8; };
  RES_0_L(){ this.register_L &= ~(0x1 << 0); return 8; };
  RES_0_PHL(){ this.register_PHL &= ~(0x1 << 0); return 16; };

  RES_1_A(){ this.register_A &= ~(0x1 << 1); return 8; };
  RES_1_B(){ this.register_B &= ~(0x1 << 1); return 8; };
  RES_1_C(){ this.register_C &= ~(0x1 << 1); return 8; };
  RES_1_D(){ this.register_D &= ~(0x1 << 1); return 8; };
  RES_1_E(){ this.register_E &= ~(0x1 << 1); return 8; };
  RES_1_H(){ this.register_H &= ~(0x1 << 1); return 8; };
  RES_1_L(){ this.register_L &= ~(0x1 << 1); return 8; };
  RES_1_PHL(){ this.register_PHL &= ~(0x1 << 1); return 16; };

  RES_2_A(){ this.register_A &= ~(0x1 << 2); return 8; };
  RES_2_B(){ this.register_B &= ~(0x1 << 2); return 8; };
  RES_2_C(){ this.register_C &= ~(0x1 << 2); return 8; };
  RES_2_D(){ this.register_D &= ~(0x1 << 2); return 8; };
  RES_2_E(){ this.register_E &= ~(0x1 << 2); return 8; };
  RES_2_H(){ this.register_H &= ~(0x1 << 2); return 8; };
  RES_2_L(){ this.register_L &= ~(0x1 << 2); return 8; };
  RES_2_PHL(){ this.register_PHL &= ~(0x1 << 2); return 16; };

  RES_3_A(){ this.register_A &= ~(0x1 << 3); return 8; };
  RES_3_B(){ this.register_B &= ~(0x1 << 3); return 8; };
  RES_3_C(){ this.register_C &= ~(0x1 << 3); return 8; };
  RES_3_D(){ this.register_D &= ~(0x1 << 3); return 8; };
  RES_3_E(){ this.register_E &= ~(0x1 << 3); return 8; };
  RES_3_H(){ this.register_H &= ~(0x1 << 3); return 8; };
  RES_3_L(){ this.register_L &= ~(0x1 << 3); return 8; };
  RES_3_PHL(){ this.register_PHL &= ~(0x1 << 3); return 16; };

  RES_4_A(){ this.register_A &= ~(0x1 << 4); return 8; };
  RES_4_B(){ this.register_B &= ~(0x1 << 4); return 8; };
  RES_4_C(){ this.register_C &= ~(0x1 << 4); return 8; };
  RES_4_D(){ this.register_D &= ~(0x1 << 4); return 8; };
  RES_4_E(){ this.register_E &= ~(0x1 << 4); return 8; };
  RES_4_H(){ this.register_H &= ~(0x1 << 4); return 8; };
  RES_4_L(){ this.register_L &= ~(0x1 << 4); return 8; };
  RES_4_PHL(){ this.register_PHL &= ~(0x1 << 4); return 16; };

  RES_5_A(){ this.register_A &= ~(0x1 << 5); return 8; };
  RES_5_B(){ this.register_B &= ~(0x1 << 5); return 8; };
  RES_5_C(){ this.register_C &= ~(0x1 << 5); return 8; };
  RES_5_D(){ this.register_D &= ~(0x1 << 5); return 8; };
  RES_5_E(){ this.register_E &= ~(0x1 << 5); return 8; };
  RES_5_H(){ this.register_H &= ~(0x1 << 5); return 8; };
  RES_5_L(){ this.register_L &= ~(0x1 << 5); return 8; };
  RES_5_PHL(){ this.register_PHL &= ~(0x1 << 5); return 16; };

  RES_6_A(){ this.register_A &= ~(0x1 << 6); return 8; };
  RES_6_B(){ this.register_B &= ~(0x1 << 6); return 8; };
  RES_6_C(){ this.register_C &= ~(0x1 << 6); return 8; };
  RES_6_D(){ this.register_D &= ~(0x1 << 6); return 8; };
  RES_6_E(){ this.register_E &= ~(0x1 << 6); return 8; };
  RES_6_H(){ this.register_H &= ~(0x1 << 6); return 8; };
  RES_6_L(){ this.register_L &= ~(0x1 << 6); return 8; };
  RES_6_PHL(){ this.register_PHL &= ~(0x1 << 6); return 16; };

  RES_7_A(){ this.register_A &= ~(0x1 << 7); return 8; };
  RES_7_B(){ this.register_B &= ~(0x1 << 7); return 8; };
  RES_7_C(){ this.register_C &= ~(0x1 << 7); return 8; };
  RES_7_D(){ this.register_D &= ~(0x1 << 7); return 8; };
  RES_7_E(){ this.register_E &= ~(0x1 << 7); return 8; };
  RES_7_H(){ this.register_H &= ~(0x1 << 7); return 8; };
  RES_7_L(){ this.register_L &= ~(0x1 << 7); return 8; };
  RES_7_PHL(){ this.register_PHL &= ~(0x1 << 7); return 16; };

  /* Illegal GB Color TODO: Maybe in the future? */
  // 8 bits illegal instructions
  // LD r, (IX+d)
  // LD r, (IY+d)
  // LD (IX+d), r
  // LD (IY+d), r
  // LD (IX+d), n
  // LD (IY+d), n
  // LD A, I
  // LD A, R
  // LD I, A
  // LD R, A
  // 16 bits illegal instructions
  // LD dd, nn
  // LD IX, nn
  // LD IY, nn
  // LD dd, (nn)
  // LD IX, (nn)
  // LD IY, (nn)
  // LD (nn), dd
  // LD (nn), IX
  // LD (nn), IY
  // LD SP, IX
  // LD SP, IY


  // ------------ MAIN ----------------------------

  /* Cycle */
  /*

  Probabily 3 phases. (Research)
    Fetch, Decode and Execute

  */
  cycle(){
    let instruction_obj = this.fetch_instruction();
    let instruction = instruction_obj.instruction;
    instruction(this, ...new Array(instruction.length - 1).fill(1).map((a, b) => this.memory[this.PC + b + 1]));
    
    if(!this.is_long_jump_instruction(instruction_obj.hexadecimal)){
      this.PC += instruction.length;
    }

    this.cycles += instruction.length;
    return instruction;
  };
};
