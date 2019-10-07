class IO{

    constructor(){


    };

    /******* SOUND I/O *******/

    /*
        Address: FF00
        Contents: Register Joy Pad
        Type: R/W
    */
    P1(){

    };

    /*
        Address: FF01
        Contents: Serial transfer data 
        Type: R/W
    */
    SB(){

    };

    /*
        Address: FF02
        Contents: SI0 control
                    Bit 7: Transfer Start Flag (0: Non Transfer, 1: Start Transfer)
                    Bit 0: Shift Clock (0: External Clock 500KHz Max, 1: Internal Clock 8192Hz)
                   Stored in SB, transmitting simultaneously
        Type: R/W
    */
    SC(){

    };
    
    /* FF03 Not Used */

    /*
        Address: FF04
        Contents: Divider Register, is incremented 16384 times a second.
                   Writing any value sets it to 0
        Type: R/W
    */
    DIV(){

    };

    /*
        Address: FF05
        Contents: Timer counter, incremented by a clock freq specified by TAC register.
                   Generates interrupt when overflow
        Type: R/W
    */
    TIMA(){

    };

    /*
        Address: FF06
        Contents: Timer Modulo. When the TIMA overflows, this data will be loaded
        Type: R/W
    */
    TMA(){
        
    };

    /*
        Address: FF07
        Contents: Timer Control:
                   Bit 2: Timer Stop:
                          0: Stop Timer
                          1: Start Timer
                   Bit 1+0: 
                          00: 4.096   KHz
                          01: 262.144 KHz
                          10: 65.536  KHz
                          11: 16.384  KHz
        Type: R/W
    */
    TAC(){
        
    };

    /* FF08..FF0E Not Used */

    /*
        Address: FF0F
        Contents: Interrupt Flag:                                  | Priority | Start                            
                   Bit 0: V-Blank                                   |  1       | 0x0040
                   Bit 1: LCDC (STAT)                               |  2       | 0x0048
                   Bit 2: Timer Overflow                            |  3       | 0x0050
                   Bit 3: Serial I/O transfer complete              |  4       | 0x0058
                   Bit 4: Transition from H2L of Pin number P10-P13 |  5       | 0x0060
                   Only with the highest Priority will occur.
                   When interrupt is used a 0, should be stored in the IF register before IE register is set.
        Type: R/W
    */
    IF(){

    };

    /*
        Address: FF10
        Contents: Sound Mode 1 register, Sweep register
                   Bit 0-2: Number of sweep shift
                   Bit 3: Sweep Increase/Decrease
                         0: Addition (freq increases)
                         1: Subtraction (freq decreases)
                   Bit 4-6: Sweep Time

                   Sweep Time: dec(Bit 4-6)/128 Hz (When 0, no freq change)

                   Change of freq (NR13, NR14)
                   X(0) initial freq, X(t - 1) last freq
                   X(t) = X(t - 1) +/- X(t - 1)/2^n
        Type: R/W
    */
    NR_10(){
        
    };

    /*
        Address: FF11
        Contents: Round Mode 1 register, Sound length / Wave pattern duty
                   Bit 0-5 - Sound length data
                   Bit 6-7 - Wave Pattern Duty (Only read)
        Type: R/W
    */
    NR_11(){
        
    };

    /*
        Address: FF12
        Contents: Sound Mode 1 register, Envelope
                   Bit 0-2 - Number of envelope sweep (if zero, stop)
                   Bit 3   - Envelope UP/DOWN
                            0: Attenuate
                            1: Amplify
                   Bit 4-7 - Initial volume of envelope

                   Envelope from 0 to F. Zero being no sound.
                   Length of 1 step = n * (1 / 64) seconds
        Type: R/W
    */
    NR_12(){
        
    };

    /*
        Address: FF13
        Contents: Sound Mode 1 register, Frequency lo
                   Lower 8 bits of 11 bit frequency
                   Next 3 bit are in NR_14 (0xFF14)
        Type: W
    */
    NR_13(){
        
    };

    /*
        Address: FF14
        Contents: Sound Mode 1 register, Frequency hi
                   Bit 0-2 - 131072 / (2048 - dec(0-2 bits)) Hz
                   Bit 6 - Counter/consecutive selection
                   Bit 7 - Initial (when set, soun restarts)
        Type: W
    */
    NR_13(){
        
    };

    /* FF15 Not Used */

    /*
        Address: FF16
        Contents: Sound Mode 2 register, Sound Length; Wave Pattern Duty
                   Bit 0-5 - Sound Length Data
                   Bit 6-7 - Wave pattern duty 
                            Sound Length = (64 - t1) * (1 / 256) s
        Type: R/W
    */
    NR_21(){
        
    };

    /*
        Address: FF17
        Contents: Sound Mode 2 register, envelope
                   Bit 0-2 - Number of envelope sweep (If zero, stop envelope operation)
                   Bit 3   - Envelope UP / DOWN.
                            0: Attenuate
                            1: Amplify
                   Bit 4-7 - Initial volume of envelope
                   Length of 1 step = n * (1 / 64) seconds
        Type: R/W
    */
    NR_22(){
        
    };

    /*
        Address: FF18
        Contents: Sound Mode 2 register, frequency lo data
                  Next 3 bit are in NR_24 (0xFF19)

        Type: R/W
    */
    NR_23(){
        
    };

    /*
        Address: FF19
        Contents: Sound Mode 2 register, frequency hi data
                  Bit 0-2 - Frequency higher 3 bits
                  Bit 6   - Counter/consecutive selection (only READABLE)
                            0 = Regardless of the length data in NR21 sound can be produced consecutively.
                            1 = Sound is generated during the time period set by the length data in NR21.
                                Bit 1 of NR52 is reset.
                  Bit 7   - Initial (when set, sound restarts)
        Type: R/W
    */
    NR_24(){
        
    };

    /*
        Address: FF1A
        Contents: Sound Mode 3 register, sound on/off
                Bit 7: Sound OFF
                       0: Sound 3 output stop
                       1: Sound 3 output OK
        Type: R/W
    */
    NR_30(){
        
    };

    /*
        Address: FF1B
        Contents: Sound Mode 3 register, sound length
                  Bit 0-7 - Sound length
                  Sound Length = (256 - t1) * (1/2) seconds
        Type: R/W
    */
    NR_31(){
        
    };

    /*
        Address: FF1C
        Contents: Sound Mode 3 register, select output level
                  Bit 5-6 - Output level
                           00: Mute
                           01: Produce Wave Pattern RAM
                           10: Produce Wave Pattern RAM data shifted once to de right
                           11: Produce Wave Pattern RAM data shifted twice to de right

                  Wave Pattern RAM is located from 0xFF30-0xFF3F
        Type: R/W
    */
    NR_32(){
        
    };

    /*
        Address: FF1D
        Contents: Sound Mode 3 register, frequency's lower data
                  Lower 8 bits of an 11 bit frequency (x)
        Type: W
    */
    NR_33(){
        
    };

    /*
        Address: FF1E
        Contents: Sound Mode 3 register, frequency's higher data
                  Bit 0-2 - Frequency higher 3 bits
                  Bit 6   - Counter / consecutive flag
                            0: Regardless of the length data in NR31 sound can be produced consecutively.
                            1: Sound is generated during the time period set by the length data in NR31.
                               After this period the sound 3 ON flag (bit 2 of NR52) is reset.
                  Bit 7   - Initial (when set, sound restarts)

                  Frequency = 65536 / (2048 - x) Hz
        Type: R/W
    */
    NR_34(){
        
    };




    /******* SCREEN I/O *******/
    /*
        Address: FF40
        Contents: LDC Control
                  Bit 0: Background & Window Display (0: off, 1: on)
                  Bit 1: Sprite Display (0: off, 1: on)
                  Bit 2: Sprite Size (width * height)
                         0: (8 * 8)
                         1: (8 * 16)
                  Bit 3: Background Tile Map Display Select.
                         0: 0x9800 - 0x9BFF
                         1: 0x9C00 - 0x9FFF
                  Bit 4: Background & Window Tile Data Select.
                         0: 0x8800 - 0x97FF
                         1: 0x8000 - 0x8FFF
                  Bit 5: Window Display (0: off, 1: on)
                  Bit 6: Window Tile Map Display Select.
                         0: 0x9800 - 0x9BFF
                         1: 0x9C00 - 0x9FFF
                  Bit 7: LCD Control Operation
                         0: Stop completely. No picture on screen
                         1: Operation
                         Stopping LCD operation must be performed during V-blank to work properly.
                         V-blank can be confirmed when the value of LY is greater or equal to 144
        Type: R/W
    */
    LCDC(){
        
    };

    /*
        Address: FF41
        Contents: LDC Status
                  Bit 0-1: Mode Flag
                           00: During H-Blank
                           H-Blank period and the CPU can access the display RAM (0x8000 - 0x9FFF)
                           000___000___000___000___000___000___000______________
                           
                           01: During V-Blank
                           V-Blank period and the CPU can access the display RAM (0x8000 - 0x9FFF)
                           _______________________________________11111111111111__

                           10: During Searching OAM-RAM
                           OAM is being used (0xFE00 - 0xFE9F), the CPU can not use this area.
                           ___2______2______2______2______2______2______2____________2_

                           11: During Transfering Data to LCD Driver
                           OAM  and display RAM can not be accessed by the CPU
                           ____33____33____33_____33_____33_____33_____33___________3
                           
                  Bit 2: Coincidence Flag
                         0: LYC not equal to LCDC LY
                         1: LYC = LCDC LY 
                  Bit 3: Mode 00
                  Bit 4: Mode 01
                  Bit 5: Mode 10
                         
                  Bit 6: LYC=LY Coincidence (Selectable)
        Type: R/W
    */
    STAT(){
        
    };

    /*
        Address: FF42
        Contents: Scroll Y
                  8-Bit value 0x00-0xFF to Scroll Background Y screen position.
        Type: R/W
    */
    SCY(){
        
    };

    /*
        Address: FF43
        Contents: Scroll X
                  8-Bit value 0x00-0xFF to Scroll Background X screen position.
        Type: R/W
    */
    SCX(){
        
    };

    /*
        Address: FF44
        Contents: LCDC Y-Coordinate
                  LY indicates the vertical line to which the present data is transferred to the LCD Driver.
                  The LY can take on any value between 0 through 153. The values between 144 and 153 indicate
                  the V-Blank period. Writing will reset the counter.
        Type: R
    */
    LY(){
        
    };

    /*
        Address: FF45
        Contents: LY Compare
                  The LYC compares itself with the LY. If the values are the same it causes the STAT
                  to set the coincident flag.
        Type: R/W
    */
    LYC(){
        
    };

    /*
        Address: FF46
        Contents: DMA Transfer and Start Address
                  The DMA Transfer (40 * 28 bit) from internal ROM or RAM (0x0000-0xF19F) to
                  the OAM (address 0xFE00 - 0xFE9F)
                  The DMA transfer start address can be designated every 0x100 (0x0000 - 0xF100)
                  All of the memory space, except high RAM (0xFF80 - 0xFFFE) is not accessible during DMA.
                  So the routine must be copied and executed in high ram.
                  Usually called from a V-blank Interrupt
        Type: W
    */
    DMA(){
        
    };

    /*
        Address: FF47
        Contents: Background & Window Palette Data
                  Bit 0-1 - Data for Dot Data 00 (Lightest Color)
                  Bit 2-3 - Data for Dot Data 01 
                  Bit 4-5 - Data for Dot Data 10 
                  Bit 6-7 - Data for Dot Data 11 (Darkest Color)

                  Selects the shade of grays to use for the background and Window Pixels.
                  Since each pixel uses 2 bits, the corresponding shade will be selected from here.
        Type: R/W
    */
    BGP(){
        
    };

    /*
        Address: FF48
        Contents: Object Palette 0 Data
                  This selects the colors for sprite palette 0. Excat as BGP but value 0 is transparent
        Type: R/W
    */
    OBP0(){
        
    };

    /*
        Address: FF49
        Contents: Object Palette 1 Data
                  This selects the colors for sprite palette 1. Excat as OBP. See BGP
        Type: R/W
    */
    OBP1(){
        
    };

    /*
        Address: FF4A
        Contents: Window Y Position
                  0 <= WY <= 143 for the window to be visible
        Type: R/W
    */
    WY(){
        
    };

    /*
        Address: FF4B
        Contents: Window X Position
                  0 <= WX <= 166 for the window to be visible
                  The position X is displaced by 7.
        Type: R/W
    */
    WX(){
        
    };

    /******* INTERRUPT *******/

    /*
        Address: FFFF
        Contents: Interrupt Enable
                  Bit 0: V-Blank
                  Bit 1: LCDC (see STAT)
                  Bit 2: Timer Overflow
                  Bit 3: Serial I/O transfer complete
                  Bit 4: V-Blank
        Type: R/W
    */
    IE(){
        
    };


};