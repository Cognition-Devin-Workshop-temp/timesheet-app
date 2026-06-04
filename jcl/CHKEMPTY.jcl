//CHKEMPTY JOB (ACCT),'EMPTY FILE CHECK',
//             CLASS=A,MSGCLASS=X,
//             MSGLEVEL=(1,1),NOTIFY=&SYSUID
//*------------------------------------------------------------*
//* JOB: CHKEMPTY                                              *
//* PURPOSE: CHECK IF AN INPUT FILE IS EMPTY                   *
//*          IF EMPTY  -> SET RC=4, SKIP PROCESSING            *
//*          IF NOT EMPTY -> SET RC=0, CONTINUE PROCESSING     *
//*------------------------------------------------------------*
//*
//*------------------------------------------------------------*
//* STEP010 - CHECK IF INPUT FILE IS EMPTY USING IDCAMS        *
//*           PRINT WILL SET RC=4 IF FILE HAS NO RECORDS       *
//*------------------------------------------------------------*
//STEP010  EXEC PGM=IDCAMS
//SYSPRINT DD SYSOUT=*
//INPUTDD  DD DSN=&INFILE,DISP=SHR
//SYSIN    DD *
  PRINT INFILE(INPUTDD) COUNT(1)
/*
//*
//*------------------------------------------------------------*
//* STEP020 - PROCESS FILE (RUNS ONLY IF FILE IS NOT EMPTY)    *
//*           COND=(4,EQ,STEP010) SKIPS THIS STEP IF RC=4     *
//*------------------------------------------------------------*
//STEP020  EXEC PGM=IEBGENER,COND=(4,EQ,STEP010)
//SYSPRINT DD SYSOUT=*
//SYSIN    DD DUMMY
//SYSUT1   DD DSN=&INFILE,DISP=SHR
//SYSUT2   DD DSN=&OUTFILE,
//             DISP=(NEW,CATLG,DELETE),
//             SPACE=(TRK,(5,5),RLSE),
//             DCB=(RECFM=FB,LRECL=80,BLKSIZE=0)
//*
//*------------------------------------------------------------*
//* STEP030 - NOTIFY: FILE WAS EMPTY (RUNS ONLY IF RC=4)      *
//*           COND=(0,EQ,STEP010) SKIPS IF STEP010 RC=0       *
//*------------------------------------------------------------*
//STEP030  EXEC PGM=IDCAMS,COND=(0,EQ,STEP010)
//SYSPRINT DD SYSOUT=*
//SYSIN    DD *
  SET LASTCC = 4
/*
//*------------------------------------------------------------*
//* USAGE:                                                     *
//*   SUBMIT WITH SYMBOLIC PARAMETERS:                         *
//*     INFILE  = INPUT DATASET TO CHECK                       *
//*     OUTFILE = OUTPUT DATASET (IF INPUT IS NOT EMPTY)       *
//*                                                            *
//*   EXAMPLE:                                                 *
//*     // SET INFILE='MY.INPUT.FILE'                          *
//*     // SET OUTFILE='MY.OUTPUT.FILE'                        *
//*                                                            *
//* RETURN CODES:                                              *
//*   RC=0 : INPUT FILE HAS RECORDS, PROCESSING COMPLETED     *
//*   RC=4 : INPUT FILE IS EMPTY, PROCESSING SKIPPED          *
//*------------------------------------------------------------*
