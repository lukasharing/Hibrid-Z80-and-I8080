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
    this.memory = new Uint8Array(0x10000);

    this.ILLEGAL_OP = new Uint16Array([
      0xDD, 0xED, 0xFD
    ]);

    let i = this;
    this.instruction_pointer = new Array(
      i.NOP    , i.LD_DD_D16, i.LD_BC_A , 0x03     , 0x04     , 0x05     , i.LD_R_D8, 0x07     , i.LD_D16_SP , 0x09      , i.LD_A_BC , 0x0B    , 0x0C    , 0x0D    , i.LD_R_D8, 0x0F    ,
      i.STOP   , i.LD_DD_D16, i.LD_DE_A , 0x13     , 0x14     , 0x15     , i.LD_R_D8, 0x17     , 0x18        , 0x19      , i.LD_A_DE , 0x1B    , 0x1C    , 0x1D    , i.LD_R_D8, 0x1F    ,
      0x20     , i.LD_DD_D16, i.LDI_HL_A, 0x23     , 0x24     , 0x25     , i.LD_R_D8, 0x27     , 0x28        , 0x29      , i.LDI_A_HL, 0x2B    , 0x2C    , 0x2D    , i.LD_R_D8, 0x2F    ,
      0x30     , i.LD_SP_D16, i.LDD_HL_A, 0x33     , 0x34     , 0x35     , i.LD_HL_N, 0x37     , 0x38        , 0x39      , i.LDD_A_HL, 0x3B    , 0x3C    , 0x3D    , i.LD_R_D8, 0x3F    ,
      i.LD_R_R , i.LD_R_R   , i.LD_R_R  , i.LD_R_R , i.LD_R_R , i.LD_R_R , i.LD_R_HL, i.LD_R_R , i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R, i.LD_R_R, i.LD_R_R, i.LD_R_HL, i.LD_R_R,
      i.LD_R_R , i.LD_R_R   , i.LD_R_R  , i.LD_R_R , i.LD_R_R , i.LD_R_R , i.LD_R_HL, i.LD_R_R , i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R, i.LD_R_R, i.LD_R_R, i.LD_R_HL, i.LD_R_R,
      i.LD_R_R , i.LD_R_R   , i.LD_R_R  , i.LD_R_R , i.LD_R_R , i.LD_R_R , i.LD_R_HL, i.LD_R_R , i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R, i.LD_R_R, i.LD_R_R, i.LD_R_HL, i.LD_R_R,
      i.LD_HL_R, i.LD_HL_R  , i.LD_HL_R , i.LD_HL_R, i.LD_HL_R, i.LD_HL_R, i.HALT   , i.LD_HL_R, i.LD_R_R    , i.LD_R_R  , i.LD_R_R  , i.LD_R_R, i.LD_R_R, i.LD_R_R, i.LD_R_HL, i.LD_R_R,
      0x80     , 0x81       , 0x82      , 0x83     , 0x84     , 0x85     , 0x86     , 0x87     , 0x88        , 0x89      , 0x8A      , 0x8B    , 0x8C    , 0x8D    , 0x8E    , 0x8F    ,
      0x90     , 0x91       , 0x92      , 0x93     , 0x94     , 0x95     , 0x96     , 0x97     , 0x98        , 0x99      , 0x9A      , 0x9B    , 0x9C    , 0x9D    , 0x9E    , 0x9F    ,
      0xA0     , 0xA1       , 0xA2      , 0xA3     , 0xA4     , 0xA5     , 0xA6     , 0xA7     , 0xA8        , 0xA9      , 0xAA      , 0xAB    , 0xAC    , 0xAD    , 0xAE    , 0xAF    ,
      0xB0     , 0xB1       , 0xB2      , 0xB3     , 0xB4     , 0xB5     , 0xB6     , 0xB7     , 0xB8        , 0xB9      , 0xBA      , 0xBB    , 0xBC    , 0xBD    , 0xBE    , 0xBF    ,
      0xC0     , 0xC1       , 0xC2      , 0xC3     , 0xC4     , 0xC5     , 0xC6     , 0xC7     , 0xC8        , 0xC9      , 0xCA      , 0xCB    , 0xCC    , 0xCD    , 0xCE    , 0xCF    ,
      0xD0     , 0xD1       , 0xD2      , 0xD3     , 0xD4     , 0xD5     , 0xD6     , 0xD7     , 0xD8        , 0xD9      , 0xDA      , 0xDB    , 0xDC    , 0xDD    , 0xDE    , 0xDF    ,
      0xE0     , 0xE1       , i.LDH_C_A , 0xE3     , 0xE4     , 0xE5     , 0xE6     , 0xE7     , 0xE8        , 0xE9      , i.LD_NN_A , 0xEB    , 0xEC    , 0xED    , 0xEE    , 0xEF    ,
      0xF0     , 0xF1       , i.LDH_A_C , i.DI     , 0xF4     , 0xF5     , 0xF6     , 0xF7     , i.LDHL_SP_R8, i.LD_SP_HL, i.LD_A_NN , i.EI    , 0xFC    , 0xFD    , 0xFE    , 0xFF    ,
    );
  };
  /* Getter/Setter 8 bits Register */
  get register_A(){ return this.register_8bits[0x7]; };
  get register_B(){ return this.register_8bits[0x0]; };
  get register_C(){ return this.register_8bits[0x1]; };
  get register_D(){ return this.register_8bits[0x2]; };
  get register_E(){ return this.register_8bits[0x3]; };
  get register_F(){ return this.register_8bits[0x6]; };
  get register_H(){ return this.register_8bits[0x4]; };
  get register_L(){ return this.register_8bits[0x5]; };

  set register_A(_v){ this.register_8bits[0x7] = _v; };
  set register_B(_v){ this.register_8bits[0x0] = _v; };
  set register_C(_v){ this.register_8bits[0x1] = _v; };
  set register_D(_v){ this.register_8bits[0x2] = _v; };
  set register_E(_v){ this.register_8bits[0x3] = _v; };
  set register_F(_v){ this.register_8bits[0x6] = _v; };
  set register_H(_v){ this.register_8bits[0x4] = _v; };
  set register_L(_v){ this.register_8bits[0x5] = _v; };

  /* Shared register 16 bits */
  get register_HL(){ return ((this.register_H << 0x8) | this.register_L); };
  get register_BC(){ return ((this.register_B << 0x8) | this.register_C); };
  get register_DE(){ return ((this.register_D << 0x8) | this.register_E); };
  get register_AF(){ return ((this.register_A << 0x8) | this.register_F); };
  // HL is the only used inmediately in instructions.
  set register_HL(_v){ this.register_H = _v >> 0x8; this.register_L = _v & 0xFF; };

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
  set carry_flag(v){ this.register_8bits[6] = change_bit_position(this.register_8bits[6], 4, v); };
  set half_carry_flag(v){ this.register_8bits[6] = change_bit_position(this.register_8bits[6], 5, v); };
  set negative_flag(v){ this.register_8bits[6] = change_bit_position(this.register_8bits[6], 6, v); };
  set zero_flag(v){ this.register_8bits[6] = change_bit_position(this.register_8bits[6], 7, v); };

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
    this.negative_flag = this.half_carry_flag = 0;
    this.carry_flag = 1;
  };
  /* CCF (Complement Carry Flag) */
  CCF(op){
    this.negative_flag = this.half_carry_flag = 0;
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
  LD_R_D8(op1, n){ this.register_8bits[(op1 >> 0x3) & 0x3] = n; };
  /* LD r (HL) [Vice-versa] */
  LD_R_HL(op){ this.register_8bits[(op >> 0x3) & 0x3] = this.memory[this.register_HL]; };
  LD_HL_R(op){ this.memory[this.register_HL] = this.register_8bits[op & 0x3]; };
  /* LD (HL) n */
  LD_HL_N(op, n){ this.memory[this.register_HL] = n; };
  /* LD A (BC) [Vice-versa] */
  LD_A_BC(op){ this.register_A = this.memory[this.register_BC]; };
  LD_BC_A(op){ this.memory[this.register_BC] = this.register_A; };
  /* LD A (DE) [Vice-versa] */
  LD_A_DE(op){ this.register_A = this.memory[this.register_DE]; };
  LD_DE_A(op){ this.memory[this.register_DE] = this.register_A; };
  /* LDI A (HL) (Load and Increment) [Vice-versa] */
  LDI_A_HL(op){
    this.register_A = this.memory[this.register_HL];
    this.register_HL = this.register_HL + 1;
  };
  LDD_A_HL(op){
    this.register_A = this.memory[this.register_HL];
    this.register_HL = this.register_HL - 1;
  };
  /* LDI A (HL) (Load and Increment) [Vice-versa] */
  LDI_HL_A(op){
    this.memory[this.register_HL] = this.register_A;
    this.register_HL = this.register_HL + 1;
  };
  LDD_HL_A(op){
    this.memory[this.register_HL] = this.register_A;
    this.register_HL = this.register_HL - 1;
  };
  /////////// 16 bits instruction ///////////
  /* LDH A D16 (Load to Hardware Registers) [Vice-versa] */
  LDH_A_D16(op, n, m){ this.register_A = this.memory[0xFF00 | ((n << 0x8) | m)]; };
  LDH_D16_A(op, n, m){ this.memory[0xFF00 | ((n << 0x8) | m)] = this.register_A; };
  /* LDH A (C) (Load to Hardware Registers) [Vice-versa] */
  LDH_A_C(op){ this.register_A = this.memory[0xFF00 | this.register_C)]; };
  LDH_C_A(op){ this.memory[0xFF00 | this.register_C] = this.register_A; };
  /**/
  LD_DD_D16(op, m, n){
    let _i = this.register_16bits[(op >> 4) & 0x2];
    this.register_8bits[_i >> 0x3] = m;
    this.register_8bits[_i & 0x3] = n;
  };
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
};
