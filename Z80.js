class Z80{
  constructor(){

    // 16 bits
    this.SP = 0x0;
    this.PC = 0x0;

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
      (0x7 << 0x3) | 0x6, /* 0x10 - 2 -> HL */
    ]);

    this.memory = [];

    this.ILLEGAL_OP = new Uint16Array([
      0xDD, 0xED, 0xFD
    ]);

    let i = this;
    this.instruction_pointer = new Array([
      0x00, i.LD_DD_NN, i.LD_BC_A, 0x03, 0x04, 0x05, i.LD_R_N, 0x07, i.LD_NN_SP, 0x09, i.LD_A_BC, 0x0B, 0x0C, 0x0D, i.LD_R_N, 0x0F,
      0x10, i.LD_DD_NN, i.LD_DE_A, 0x13, 0x14, 0x15, i.LD_R_N, 0x17, 0x18, 0x19, i.LD_A_DE, 0x1B, 0x1C, 0x1D, i.LD_R_N, 0x1F,
      0x20, i.LD_DD_NN, i.LD_NN_HL, 0x23, 0x24, 0x25, i.LD_R_N, 0x27, 0x28, 0x29, i.LD_HL_NN, 0x2B, 0x2C, 0x2D, i.LD_R_N, 0x2F,
      0x30, i.LD_SP_NN, i.LD_NN_A, 0x33, 0x34, 0x35, i.LD_HL_N, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, i.LD_R_N, 0x3F,
      i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R_HL, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R_HL, i.LD_R1_R2,
      i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R_HL, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R_HL, i.LD_R1_R2,
      i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R_HL, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R_HL, i.LD_R1_R2,
      i.LD_HL_R, i.LD_HL_R, i.LD_HL_R, i.LD_HL_R, i.LD_HL_R, i.LD_HL_R, 0x76, i.LD_HL_R, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R1_R2, i.LD_R_HL, i.LD_R1_R2,
      0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
      0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
      0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
      0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF,
      0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF,
      0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF,
      0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, i.LD_NN_A, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
      0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, i.LD_SP_HL, i.LD_A_NN, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF,
    ]);
  };

  /* Shared register 16 bits */
  /* 00 -> 0 */
  get register_HL(){ return ((this.register_8bits[0x4] << 0x8) | this.register_8bits[0x5]); };
  /* 01 -> 1 */
  get register_BC(){ return ((this.register_8bits[0x0] << 0x8) | this.register_8bits[0x1]); };
  /* 11 -> 2 */
  get register_DE(){ return ((this.register_8bits[0x2] << 0x8) | this.register_8bits[0x3]); };

  /*
    OP R2  R1
    01 XXX YYY
    R2 <- R1
  */
  LD_R1_R2(op){ this.register_8bits[(op >> 0x3) & 0x3] = op & 0x3; };

  /*
    OP1 R   PAD OP2
    00  RRR 110 NNNNNNNN
    R <- OP2
  */
  LD_R_N(op1, n){ this.register_8bits[(op1 >> 0x3) & 0x3] = n; };

  /*
    OP R   PAD
    01 RRR 110
    R <- (HL)
  */
  LD_R_HL(op){ this.register_8bits[(op >> 0x3) & 0x3] = this.memory[this.register_HL]; };

  /*
    OP PAD R
    01 110 RRR
    (HL) <- R
  */
  LD_HL_R(op){ this.memory[this.register_HL] = this.register_8bits[op & 0x3]; };

  /*
    FIXED    P2
    00110110 NNNNNNNN
    (HL) <- OP2
  */
  LD_HL_N(n){ this.memory[this.register_HL] = n; };

  /*
    FIXED
    00110110
    A <- (BC)
  */
  LD_A_BC(){ this.register_8bits[0x7] = this.memory[this.register_BC]; };

  /*
    FIXED
    00000010
    (BC) <- A
  */
  LD_BC_A(){ this.memory[this.register_BC] = this.register_8bits[0x7]; };

  /*
    FIXED
    00011010
    A <- (DE)
  */
  LD_A_DE(){ this.register_8bits[0x7] = this.memory[this.register_DE]; };

  /*
    FIXED
    00010010
    (DE) <- A
  */
  LD_DE_A(){ this.memory[this.register_DE] = this.register_8bits[0x7]; };

  /*
    FIXED    N        M
    00111010 NNNNNNNN MMMMMMMM
    A <- (NN)
  */
  LD_A_NN(n, m){ this.register_8bits[0x7] = this.memory[(n << 0x8) | m]; };

  /*
    FIXED    N        M
    00110010 NNNNNNNN MMMMMMMM
    A <- (BC)
  */
  LD_NN_A(n, m){ this.memory[(n << 0x8) | m] = this.register_8bits[0x7]; };

  // 16 bits instruction
  /*
    PD OP PD    N        M
    00 dd 0001 NNNNNNNN MMMMMMMM
    dd <- nn
    dd != AF
  */
  LD_DD_NN(op, m, n){
    let _i = this.register_16bits[(op >> 4) & 0x2];
    this.register_8bits[_i >> 0x3] = m;
    this.register_8bits[_i & 0x3] = n;
  };

  /*
    FIXED    N        M
    00110001 NNNNNNNN MMMMMMMM
    SP <- nn
  */
  LD_SP_NN(m, n){ this.SP = (m << 0x8) | n; };

  /*
    PAD OP PAD    N        M
    00001000 NNNNNNNN MMMMMMMM
    (nn) <- nn
  */
  LD_NN_SP(m, n){
    this.memory[m] = this.SP >> 0x8;
    this.memory[n] = this.SP & 0x8;
  };

  /*
    FIXED    N        M
    00101010 NNNNNNNN MMMMMMMM
    dd <- nn
  */
  LD_HL_NN(n, m){
    this.register_8bits[0x4] = n; // H
    this.register_8bits[0x5] = m; // L
  };

  /*
    FIXED    N        M
    00100010 NNNNNNNN MMMMMMMM
    N <- H
    M <- L
  */
  LD_NN_HL(m, n){
    this.memory[m] = this.register_HL >> 0x8;
    this.memory[n] = this.register_HL & 0x8;
  };

  /*
    FIXED
    11111001
    SP <- HL
  */
  LD_SP_HL(m, n){
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
