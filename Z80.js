const change_bit_position = (b, n, v) => { return b ^= (-v ^ b) & (1 << n); };

class Z80{
  constructor(){

    // 16 bits
    this.SP = 0xFFFE; // Stack Pointer (Default = 0xFFFE, Last Stack Memory Offset)
    this.PC = 0x0000; // Program Counter (Default = 0x0100, Cartridge Header Area)

    this.register_8bits = new Uint8Array([
      0x0, /* 000 - 0 -> B (GP)*/
      0x0, /* 001 - 1 -> C (Counter)*/
      0x0, /* 010 - 2 -> D (GP)*/
      0x0, /* 011 - 3 -> E (GP) */
      0x0, /* 100 - 4 -> H (Pointer) */
      0x0, /* 101 - 5 -> L (Pointer) */
      0x0, /* 110 - 6 -> F (Status Flag) */
      0x0  /* 111 - 7 -> A (Accumulator) */
    ]);

    this.register_16bits = new Uint16Array([
      (0x0 << 0x3) | 0x1, /* 0x00 - 0 -> BC */
      (0x2 << 0x3) | 0x3, /* 0x01 - 1 -> DE */
      (0x4 << 0x3) | 0x5, /* 0x10 - 2 -> HL */
      (0x7 << 0x3) | 0x6, /* 0x11 - 3 -> AF */
    ]);

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

    this.ILLEGAL_OP = new Uint16Array([
      0xDD, 0xED, 0xFD
    ]);

    let i = this;
    this.instruction_pointer = new Array(
      i.NOP    , i.LD_BC_D16 , i.LD_BC_A , i.INC_BC  , i.INC_B   , 0x05      , i.LD_B_D8  , 0x07      , i.LD_D16_SP , 0x09      , i.LD_A_BC , 0x0B    , i.INC_C , 0x0D    , i.LD_C_D8, 0x0F    ,
      i.STOP   , i.LD_DE_D16 , i.LD_DE_A , i.INC_DE  , i.INC_D   , 0x15      , i.LD_D_D8  , 0x17      , i.JR_N      , 0x19      , i.LD_A_DE , 0x1B    , i.INC_E , 0x1D    , i.LD_E_D8, 0x1F    ,
      i.JR_NZ_N, i.LD_PHL_D16, i.LD_IHL_A, i.INC_HL  , i.INC_H   , 0x25      , i.LD_H_D8  , 0x27      , i.JR_Z_N    , 0x29      , i.LD_A_IHL, 0x2B    , i.INC_L , 0x2D    , i.LD_L_D8, 0x2F    ,
      i.JR_NC_N, i.LD_SP_D16 , i.LD_DHL_A, i.INC_SP  , i.INC_HL  , 0x35      , i.LD_PHL_D8, 0x37      , i.JR_C_N    , 0x39      , i.LD_A_DHL, 0x3B    , i.INC_A , 0x3D    , i.LD_A_D8, 0x3F    ,
      i.LD_R_R , i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R  , i.LD_R_R  , i.LD_B_HL  , i.LD_R_R  , i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R, i.LD_R_R, i.LD_R_R, i.LD_C_HL, i.LD_R_R,
      i.LD_R_R , i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R  , i.LD_R_R  , i.LD_D_HL  , i.LD_R_R  , i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R, i.LD_R_R, i.LD_R_R, i.LD_E_HL, i.LD_R_R,
      i.LD_R_R , i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R  , i.LD_R_R  , i.LD_H_HL  , i.LD_R_R  , i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R, i.LD_R_R, i.LD_R_R, i.LD_L_HL, i.LD_R_R,
      i.LD_PHL_B, i.LD_PHL_C , i.LD_PHL_D, i.LD_PHL_E, i.LD_PHL_H, i.LD_PHL_L, i.HALT     , i.LD_PHL_A, i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R, i.LD_R_R, i.LD_R_R, i.LD_A_HL, i.LD_R_R,
      0x80     , 0x81        , 0x82      , 0x83      , 0x84      , 0x85      , 0x86       , 0x87      , 0x88        , 0x89      , 0x8A      , 0x8B    , 0x8C    , 0x8D    , 0x8E     , 0x8F    ,
      0x90     , 0x91        , 0x92      , 0x93      , 0x94      , 0x95      , 0x96       , 0x97      , 0x98        , 0x99      , 0x9A      , 0x9B    , 0x9C    , 0x9D    , 0x9E     , 0x9F    ,
      0xA0     , 0xA1        , 0xA2      , 0xA3      , 0xA4      , 0xA5      , 0xA6       , 0xA7      , i.XOR_B     , i.XOR_C   , i.XOR_D   , i.XOR_E , i.XOR_H , i.XOR_L , i.XOR_HL , i.XOR_A ,
      0xB0     , 0xB1        , 0xB2      , 0xB3      , 0xB4      , 0xB5      , 0xB6       , 0xB7      , 0xB8        , 0xB9      , 0xBA      , 0xBB    , 0xBC    , 0xBD    , 0xBE     , 0xBF    ,
      0xC0     , i.POP_BC    , i.JP_NZ_NN, 0xC3      , 0xC4      , 0xC5      , 0xC6       , 0xC7      , 0xC8        , 0xC9      , i.JP_Z_NN , i.PREFIX, 0xCC    , 0xCD    , 0xCE     , 0xCF    ,
      0xD0     , i.POP_DE    , i.JP_NC_NN, 0xD3      , 0xD4      , 0xD5      , 0xD6       , 0xD7      , 0xD8        , 0xD9      , i.JP_C_NN , 0xDB    , 0xDC    , 0xDD    , 0xDE     , 0xDF    ,
      0xE0     , i.POP_HL    , i.LDH_C_A , 0xE3      , 0xE4      , 0xE5      , 0xE6       , 0xE7      , 0xE8        , i.JP_HL   , i.LD_NN_A , 0xEB    , 0xEC    , 0xED    , i.XOR_D8 , 0xEF    ,
      0xF0     , i.POP_AF    , i.LDH_A_C , i.DI      , 0xF4      , 0xF5      , 0xF6       , 0xF7      , i.LDHL_SP_HL, i.LD_SP_HL, i.LD_A_NN , i.EI    , 0xFC    , 0xFD    , 0xFE     , 0xFF    ,
    );
  };

  // ------------ REGISTERS ----------------------------

  /* Getter/Setter 8 bits Register */
  get register_A(){ return this.register_8bits[0x7]; };
  get register_B(){ return this.register_8bits[0x0]; };
  get register_C(){ return this.register_8bits[0x1]; };
  get register_D(){ return this.register_8bits[0x2]; };
  get register_E(){ return this.register_8bits[0x3]; };
  get register_F(){ return this.register_8bits[0x6]; };
  get register_H(){ return this.register_8bits[0x4]; };
  get register_L(){ return this.register_8bits[0x5]; };

  set register_A(_v){ this.register_8bits[0x7] = _v & 0xFF; };
  set register_B(_v){ this.register_8bits[0x0] = _v & 0xFF; };
  set register_C(_v){ this.register_8bits[0x1] = _v & 0xFF; };
  set register_D(_v){ this.register_8bits[0x2] = _v & 0xFF; };
  set register_E(_v){ this.register_8bits[0x3] = _v & 0xFF; };
  set register_F(_v){ this.register_8bits[0x6] = _v & 0xFF; };
  set register_H(_v){ this.register_8bits[0x4] = _v & 0xFF; };
  set register_L(_v){ this.register_8bits[0x5] = _v & 0xFF; };

  /* Shared register 16 bits */
  get register_HL(){ return ((this.register_H << 0x8) | this.register_L); };
  get register_BC(){ return ((this.register_B << 0x8) | this.register_C); };
  get register_DE(){ return ((this.register_D << 0x8) | this.register_E); };
  get register_AF(){ return ((this.register_A << 0x8) | this.register_F); };
  // HL is the only used inmediately in instructions.
  set register_HL(_v){ this.register_H = _v >> 0x8; this.register_L = _v & 0xFF; };
  set register_BC(_v){ this.register_B = _v >> 0x8; this.register_C = _v & 0xFF; };
  set register_DE(_v){ this.register_D = _v >> 0x8; this.register_E = _v & 0xFF; };
  set register_AF(_v){ this.register_A = _v >> 0x8; this.register_F = _v & 0xFF; };

  /* Flags (F Register 8 bits)
    Bit 0 -> 0
    Bit 1 -> 0
    Bit 2 -> 0
    Bit 3 -> 0
    Bit 4 -> C (Carry Flag)
    Bit 5 -> H (Half-Carry Flag)
    Bit 6 -> N (Negative Number Flag)
    Bit 7 -> Z (Zero Flag)
  */
  /* Set Flags */


  //
  set carry_flag(v){ this.register_8bits[6] = change_bit_position(this.register_8bits[6], 4, v); };

  // When doing an operation if there was a carried from bit 3 to bit 4.
  set half_carry_flag(v){ this.register_8bits[6] = change_bit_position(this.register_8bits[6], 5, v); };

  // If the number is negative, then the flag is set.
  set negative_flag(v){ this.register_8bits[6] = change_bit_position(this.register_8bits[6], 6, v); };
  set zero_flag(v){ this.register_8bits[6] = change_bit_position(this.register_8bits[6], 7, v); };

  // ------------ STACK ----------------------------
  pop_stack_byte(){ this.SP -= 1; return this.memory[this.SP + 1]; };

  // TODO: Is it little-endian or big-endian??
  pop_stack_short(){ this.SP -= 2; return ((this.memory[this.SP + 2] << 8) | this.memory[this.SP + 1]); };

  // ------------ INSTRUCTIONS ---------------------

  /* Miscellaneous */
  /* NOP (The machine does nothing) */
  NOP(op){};
  /* HALT (Freezes until interrupt occurs) */
  HALT(op){};
  /* STOP (Halt CPU and LCD until interrupt occurs) - SUPPOSED TO BE 10 00 (2 bytes long)*/
  STOP(op){};
  /* [E/D]I (Enable/Disable Interrupts After calling the instruction not at the moment) */
  EI(op){};
  DI(op){};
  /* CPL (Complement A Register) */
  CPL(op){

  };
  /* SCF (Set Carry Flag) */
  SCF(op){
    this.negative_flag = 0;
    this.half_carry_flag = 0;
    this.carry_flag = 1;
  };
  /* CCF (Complement Carry Flag) */
  CCF(op){
    this.negative_flag = 0;
    this.half_carry_flag = 0;
    this.carry_flag ^= 1;
  };

  /*
    r = Register
    n = Number
    r8 = 8 bit signed data added to the program data.
    d8 = 1 Offset
    d16 = 2 Offsets
  */

  /* LOAD (LD) Instructions */
  /* LD r, r */
  LD_R_R(op){ this.register_8bits[(op >> 0x3) & 0x3] = op & 0x3; };

  /* LD r, d8 */
  LD_A_D8(op, n){ this.register_A = n; };
  LD_B_D8(op, n){ this.register_B = n; };
  LD_C_D8(op, n){ this.register_C = n; };
  LD_D_D8(op, n){ this.register_D = n; };
  LD_E_D8(op, n){ this.register_E = n; };
  LD_H_D8(op, n){ this.register_H = n; };
  LD_L_D8(op, n){ this.register_L = n; };
  LD_PHL_D8(op, n){ this.memory[this.register_HL] = n; };

  /* LD register (HL) */
  LD_A_HL(op){ this.register_A = this.memory[this.register_HL]; };
  LD_B_HL(op){ this.register_B = this.memory[this.register_HL]; };
  LD_C_HL(op){ this.register_C = this.memory[this.register_HL]; };
  LD_D_HL(op){ this.register_D = this.memory[this.register_HL]; };
  LD_E_HL(op){ this.register_E = this.memory[this.register_HL]; };
  LD_H_HL(op){ this.register_H = this.memory[this.register_HL]; };
  LD_L_HL(op){ this.register_L = this.memory[this.register_HL]; };

  /* LD (HL) register */
  LD_PHL_A(op){ this.memory[this.register_HL] = this.register_A; };
  LD_PHL_B(op){ this.memory[this.register_HL] = this.register_B; };
  LD_PHL_C(op){ this.memory[this.register_HL] = this.register_C; };
  LD_PHL_D(op){ this.memory[this.register_HL] = this.register_D; };
  LD_PHL_E(op){ this.memory[this.register_HL] = this.register_E; };
  LD_PHL_H(op){ this.memory[this.register_HL] = this.register_H; };
  LD_PHL_L(op){ this.memory[this.register_HL] = this.register_L; };

  /* LD (0xff00 + a) = register_a */
  LD_NN_A(op, a){ this.memory[0xFF00 | a] = this.register_A; };

  /* LD register_a = (0xff00 + a) */
  LD_A_NN(op, a){ this.register_A = this.memory[0xFF00 | a]; };

  /* LD A (BC) [Vice-versa] */
  LD_A_BC(op){ this.register_A = this.memory[this.register_BC]; };
  LD_BC_A(op){ this.memory[this.register_BC] = this.register_A; };
  /* LD A (DE) [Vice-versa] */
  LD_A_DE(op){ this.register_A = this.memory[this.register_DE]; };
  LD_DE_A(op){ this.memory[this.register_DE] = this.register_A; };
  /* LD A (HL-) (Load and Increment) [Vice-versa] */
  LD_A_IHL(op){
    this.register_A = this.memory[this.register_HL];
    this.register_HL = this.register_HL + 1;
  };
  LD_IHL_A(op){
    this.memory[this.register_HL] = this.register_A;
    this.register_HL = this.register_HL + 1;
  };
  /* LD A (HL-) (Load and Decrement) [Vice-versa] */
  LD_A_DHL(op){
    this.register_A = this.memory[this.register_HL];
    this.register_HL = this.register_HL - 1;
  };
  LD_DHL_A(op){
    this.memory[this.register_HL] = this.register_A;
    this.register_HL = this.register_HL - 1;
  };
  /////////// 16 bits instruction ///////////
  /* LDH A D16 (Load to Hardware Registers) [Vice-versa] */
  LDH_A_D16(op, n, m){ this.register_A = this.memory[0xFF00 | ((n << 0x8) | m)]; };
  LDH_D16_A(op, n, m){ this.memory[0xFF00 | ((n << 0x8) | m)] = this.register_A; };
  /* LDH A (C) (Load to Hardware Registers) [Vice-versa] */
  LDH_A_C(op){ this.register_A = this.memory[0xFF00 | this.register_C]; };
  LDH_C_A(op){ this.memory[0xFF00 | this.register_C] = this.register_A; };
  /* LD short_register short */
  LD_BC_D16(op, n, m){ this.register_B = n; this.register_C = m; };
  LD_DE_D16(op, n, m){ this.register_D = n; this.register_E = m; };
  LD_PHL_D16(op, n, m){ this.register_H = n; this.register_L = m; };
  LD_AF_D16(op, n, m){ this.register_A = n; this.register_F = m; };

  /* LDHL SP r8 */
  // TODO: Is this right ? this.PC += r8
  LDHL_SP_R8(op, n){
    let r8 = n - ((n >= 0x80) << 8); // Complement's 2 (Signed 8bit number)
    let effective_address = this.SP + r8;
    this.register_HL = this.memory[effective_address];
    this.carry_flag = (effective_address & 0x100) === 0x100;
    this.half_carry_flag = (effective_address & 0x10) === 0x10;
    this.zero_flag = this.negative_flag = 0;
  }
  /**/
  LD_SP_D16(op, m, n){ this.SP = (m << 0x8) | n; };
  /**/
  LD_D16_SP(op, m, n){
    this.memory[m] = this.SP >> 0x8;
    this.memory[n] = this.SP & 0x8;
  };
  /**/
  LD_NN_HL(op, m, n){
    this.memory[m] = this.register_HL >> 0x8;
    this.memory[n] = this.register_HL & 0x8;
  };
  /* SP <- HL */
  LD_SP_HL(op){
    this.SP = this.register_HL;
  };

  /* POP Stack Instructions */
  POP_BC(op){
    this.register_BC = this.pop_stack_short();
  };
  POP_DE(op){
    this.register_DE = this.pop_stack_short();
  };
  POP_HL(op){
    this.register_HL = this.pop_stack_short();
  };
  POP_AF(op){
    this.register_AF = this.pop_stack_short();
  };

  /* Mathematical Instructions */
  // Increments byte
  INC_R_FLAGS(value){
    this.negative_flag   = 0;
    this.zero_flag       = (value === 0);
    this.half_carry_flag = (value & 0x10) === 0x10;
  };

  INC_A(op){ this.register_A = this.register_A + 1; INC_R_FLAGS(this.register_A); };
  INC_B(op){ this.register_B = this.register_B + 1; INC_R_FLAGS(this.register_B); };
  INC_C(op){ this.register_C = this.register_C + 1; INC_R_FLAGS(this.register_C); };
  INC_D(op){ this.register_D = this.register_D + 1; INC_R_FLAGS(this.register_D); };
  INC_E(op){ this.register_E = this.register_E + 1; INC_R_FLAGS(this.register_E); };
  INC_H(op){ this.register_H = this.register_H + 1; INC_R_FLAGS(this.register_H); };
  INC_L(op){ this.register_L = this.register_L + 1; INC_R_FLAGS(this.register_L); };
  INC_PHL(op){ this.memory[this.register_HL] = this.memory[this.register_HL] + 1; INC_R_FLAGS(this.memory[this.register_HL]); }

  // Increments Short
  INC_BC(op){ this.register_BC = this.register_BC + 1; };
  INC_DE(op){ this.register_DE = this.register_DE + 1; };
  INC_HL(op){ this.register_HL = this.register_HL + 1; };
  INC_SP(op){ this.register_SP = this.register_SP + 1; };

  // XOR (A <- A ^ R)
  XOR_R(op, register){
    this.register_a      = this.register_a ^ register;
    this.zero_flag       = this.register_a === 0;
    this.carry_flag      = 0;
    this.negative_flag   = 0;
    this.half_carry_flag = 0;
  };

  XOR_A(op){ this.XOR_R(op, this.register_A); };
  XOR_B(op){ this.XOR_R(op, this.register_B); };
  XOR_C(op){ this.XOR_R(op, this.register_C); };
  XOR_D(op){ this.XOR_R(op, this.register_D); };
  XOR_E(op){ this.XOR_R(op, this.register_E); };
  XOR_H(op){ this.XOR_R(op, this.register_H); };
  XOR_L(op){ this.XOR_R(op, this.register_L); };
  XOR_HL(op){ this.XOR_R(op, this.memory[this.register_HL]); };
  XOR_D8(op, n){ this.XOR_R(op, this.memory[n]); };


  /* JUMP Instructions */
  // Jump to NN
  JP_NN(op, a, b){
    this.PC = (a | (b << 8)) - 3; // Subtract 3 of opcode + short
  };

  // Jump to NN if Zero Flag is Unset
  JP_NZ_NN(op, a, b){
    if(this.zero_flag === 0){
      this.JP_NN(op, a, b);
    }
  };

  // Jump to NN if Zero Flag is Set
  JP_Z_NN(op, a, b){
    if(this.zero_flag === 1){
      this.JP_NN(op, a, b);
    }
  };

  // Jump to NN if Carry Flag is Unset
  JP_NC_NN(op, a, b){
    if(this.carry_flag === 0){
      this.JP_NN(op, a, b);
    }
  };

  // Jump if Carry Flag is Set to NN
  JP_C_NN(op, a, b){
    if(this.carry_flag === 1){
      this.JP_NN(op, a, b);
    }
  };

  // Jump to HL
  JP_HL(op){
    this.PC = this.register_HL - 1; // Remove 1 From Op
  };

  // Increment Program Counter.
  JR_N(op, n){
    this.PC += n - 2; // Subtract 2 of opcode + byte
  };

  // Increment Program Counter if Zero Flag is Set
  JR_NZ_N(op, n){
    if(this.zero_flag === 0){
      this.JR_NN(op, n);
    }
  };

  // Increment Program Counter if Zero Flag
  JR_Z_N(op, n){
    if(this.zero_flag === 1){
      this.JR_NN(op, n);
    }
  };

  // Increment Program Counter  if Carry Flag
  JR_NC_N(op, n){
    if(this.carry_flag === 0){
      this.JR_NN(op, n);
    }
  };

  // Increment Program Counter if Carry Flag is Set
  JR_C_N(op, n){
    if(this.carry_flag === 1){
      this.JR_NN(op, n);
    }
  };

  /* PREFIX */
  PREFIX(op, n){
    console.log(n);
  };


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
  cycle(){
    let hex_instruction = this.memory[this.PC];
    let instruction = this.instruction_pointer[hex_instruction];
    // Check if the instruction doesn't exists.
    if(isFinite(instruction)){
      throw new Error(`Instruction (0x${hex_instruction.toString(16)}) is not implemented.`);
    }

    this.PC += instruction.length;
    return instruction;
  };
};
