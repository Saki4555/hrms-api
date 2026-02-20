--
-- Create Schema Script 
--   Database Version          : 11.2.0.1.0 
--   Database Compatible Level : 11.2.0.0.0 
--   Script Compatible Level   : 11.2.0.0.0 
--   Toad Version              : 12.1.0.22 
--   DB Connect String         : 103.172.44.99:1521/RS 
--   Schema                    : HCM 
--   Script Created by         : SPU 
--   Script Created at         : 2/14/2026 11:07:32 AM 
--   Physical Location         :  
--   Notes                     :  
--

-- Object Counts: 
--   Users: 1           Sys Privs: 7        Tablespace Quotas: 1 
--   Tablespaces: 2     DataFiles: 1        TempFiles: 1 
-- 
--   Directories: 8 
--   Functions: 4       Lines of Code: 343 
--   Indexes: 66        Columns: 70         
--   Object Privileges: 10 
--   Procedures: 1      Lines of Code: 11 
--   Sequences: 41 
--   Tables: 52         Columns: 479        Constraints: 139    
--   Triggers: 43 
--   Views: 6           Columns: 49         


-- "Set define off" turns off substitution variables. 
Set define off; 

--
-- HCM_TS  (Tablespace) 
--
CREATE TABLESPACE HCM_TS DATAFILE 
  '/home/oracle/database/hcm_ts01.dbf' SIZE 1G AUTOEXTEND ON NEXT 100M MAXSIZE UNLIMITED
LOGGING
ONLINE
EXTENT MANAGEMENT LOCAL AUTOALLOCATE
BLOCKSIZE 8K
SEGMENT SPACE MANAGEMENT AUTO
FLASHBACK ON;


--
-- TEMP  (Tablespace) 
--
CREATE TEMPORARY TABLESPACE TEMP TEMPFILE 
  '/u01/app/oracle/oradata/rs/temp01.dbf' SIZE 1098M AUTOEXTEND ON NEXT 640K MAXSIZE UNLIMITED
TABLESPACE GROUP ''
EXTENT MANAGEMENT LOCAL UNIFORM SIZE 1M;


--
-- "DEFAULT"  (Profile) 
--
CREATE PROFILE "DEFAULT" LIMIT
  SESSIONS_PER_USER UNLIMITED
  CPU_PER_SESSION UNLIMITED
  CPU_PER_CALL UNLIMITED
  CONNECT_TIME UNLIMITED
  IDLE_TIME UNLIMITED
  LOGICAL_READS_PER_SESSION UNLIMITED
  LOGICAL_READS_PER_CALL UNLIMITED
  COMPOSITE_LIMIT UNLIMITED
  PRIVATE_SGA UNLIMITED
  FAILED_LOGIN_ATTEMPTS 10
  PASSWORD_LIFE_TIME 180
  PASSWORD_REUSE_TIME UNLIMITED
  PASSWORD_REUSE_MAX UNLIMITED
  PASSWORD_LOCK_TIME 1
  PASSWORD_GRACE_TIME 7
  PASSWORD_VERIFY_FUNCTION NULL;


--
-- HCM  (User) 
--
CREATE USER HCM
  IDENTIFIED BY <password>
  DEFAULT TABLESPACE HCM_TS
  TEMPORARY TABLESPACE TEMP
  PROFILE DEFAULT
  ACCOUNT UNLOCK;
  -- 7 System Privileges for HCM 
  GRANT CREATE PROCEDURE TO HCM;
  GRANT CREATE SEQUENCE TO HCM;
  GRANT CREATE SESSION TO HCM;
  GRANT CREATE TABLE TO HCM;
  GRANT CREATE TRIGGER TO HCM;
  GRANT CREATE TYPE TO HCM;
  GRANT CREATE VIEW TO HCM;
  -- 1 Tablespace Quota for HCM 
  ALTER USER HCM QUOTA UNLIMITED ON HCM_TS;


--
-- DATA_PUMP_DIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
DATA_PUMP_DIR AS 
'/u01/app/oracle/admin/rs/dpdump/';


--
-- DB  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
DB AS 
'/var/www/html/db';


--
-- DMPDIR1  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
DMPDIR1 AS 
'/u01/backup';


--
-- DPDUMP1  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
DPDUMP1 AS 
'/home/oracle/dpdump1';


--
-- MYDIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
MYDIR AS 
'/u01/backup';


--
-- ORACLE_OCM_CONFIG_DIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
ORACLE_OCM_CONFIG_DIR AS 
'/u01/app/oracle/product/11.2/db_1/ccr/state';


--
-- TEST_DIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
TEST_DIR AS 
'/var/www/html/SPU/EXCEL';


--
-- XMLDIR  (Directory) 
--
CREATE OR REPLACE DIRECTORY 
XMLDIR AS 
'/ade/b/2125410156/oracle/rdbms/xml';


--
-- COUNTRY_LIST  (Table) 
--
CREATE TABLE HCM.COUNTRY_LIST
(
  COUNTRY_ID    NUMBER,
  COUNTRY_NAME  VARCHAR2(30 BYTE)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- DISTRICT_LIST  (Table) 
--
CREATE TABLE HCM.DISTRICT_LIST
(
  DISTRICT_ID    NUMBER,
  COUNTRY_ID     NUMBER,
  REGION_ID      NUMBER,
  DISTRICT_NAME  VARCHAR2(30 BYTE)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_AUDIT_LOG  (Table) 
--
CREATE TABLE HCM.HR_AUDIT_LOG
(
  AUDIT_ID    NUMBER,
  TABLE_NAME  VARCHAR2(100 BYTE)                NOT NULL,
  OPERATION   VARCHAR2(10 BYTE)                 NOT NULL,
  CHANGED_BY  VARCHAR2(100 BYTE),
  CHANGED_ON  TIMESTAMP(6)                      DEFAULT SYSTIMESTAMP,
  KEY_VALUES  VARCHAR2(1000 BYTE),
  OLD_VALUES  CLOB,
  NEW_VALUES  CLOB
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_COMPANY  (Table) 
--
CREATE TABLE HCM.HR_COMPANY
(
  COMPANY_ID            NUMBER,
  COMPANY_NAME          VARCHAR2(100 BYTE),
  COMPANY_DETAIL        VARCHAR2(200 BYTE),
  BIN_NO                VARCHAR2(50 BYTE),
  ADDRESS               VARCHAR2(200 BYTE),
  EFFECTIVE_START_DATE  DATE,
  EFFECTIVE_END_DATE    DATE,
  STATUS                NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_DEPARTMENT  (Table) 
--
CREATE TABLE HCM.HR_DEPARTMENT
(
  DEPARTMENT_ID         NUMBER,
  NAME                  VARCHAR2(200 BYTE)      NOT NULL,
  PARENT_DEPARTMENT_ID  NUMBER,
  LOCATION              VARCHAR2(200 BYTE),
  COST_CENTER           VARCHAR2(100 BYTE),
  CREATED_BY            VARCHAR2(100 BYTE),
  CREATED_DATE          TIMESTAMP(6)            DEFAULT SYSTIMESTAMP,
  UPDATED_BY            VARCHAR2(100 BYTE),
  UPDATED_DATE          TIMESTAMP(6)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_EMPLOYEE  (Table) 
--
CREATE TABLE HCM.HR_EMPLOYEE
(
  PERSON_ID             NUMBER,
  EMP_NO                VARCHAR2(20 BYTE),
  TITLE                 VARCHAR2(10 BYTE),
  FIRST_NAME            VARCHAR2(50 BYTE),
  LAST_NAME             VARCHAR2(50 BYTE),
  FATHERS_NAME          VARCHAR2(100 BYTE),
  FATHERS_NAME_B        VARCHAR2(100 BYTE),
  MOTHERS_NAME          VARCHAR2(100 BYTE),
  MOTHERS_NAME_B        VARCHAR2(100 BYTE),
  GENDER                VARCHAR2(10 BYTE),
  DATE_OF_BIRTH         DATE,
  NID                   VARCHAR2(30 BYTE),
  BIRTH_REG_NO          VARCHAR2(30 BYTE),
  TOWN_OF_BIRTH         VARCHAR2(30 BYTE),
  REGION_OF_BIRTH       VARCHAR2(30 BYTE),
  COUNTRY_OF_BIRTH      VARCHAR2(30 BYTE),
  MARRITIAL_STATUS      NUMBER,
  NATIONALITY           VARCHAR2(30 BYTE),
  JOIN_DATE             DATE,
  PERSON_TYPE_ID        NUMBER,
  REG_DISABILITY        NUMBER,
  EFFECTIVE_START_DATE  DATE,
  EFFECTIVEEND_DATE     DATE,
  CREATION_DATE         DATE,
  LAST_UPDATE_DATE      DATE,
  LAST_UPDATE_BY        NUMBER,
  STATUS                NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_EMP_ADDRESS  (Table) 
--
CREATE TABLE HCM.HR_EMP_ADDRESS
(
  PERSON_ID             NUMBER,
  ADDRESS_TYPE_ID       NUMBER,
  ADDRESS1              VARCHAR2(100 BYTE),
  ADDRESS1_B            VARCHAR2(100 BYTE),
  COUNTRY               VARCHAR2(30 BYTE),
  REGION                VARCHAR2(30 BYTE),
  DISTRICT              VARCHAR2(30 BYTE),
  UPAZILLA              VARCHAR2(30 BYTE),
  UNIONS                VARCHAR2(30 BYTE),
  AREA                  VARCHAR2(30 BYTE),
  EFFECTIVE_START_DATE  DATE,
  EFFECTIVEEND_DATE     DATE,
  CREATION_DATE         DATE,
  LAST_UPDATE_DATE      DATE,
  LAST_UPDATE_BY        NUMBER,
  STATUS                NUMBER,
  EMP_NO                VARCHAR2(20 BYTE)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_EMP_ASSIGNMENT  (Table) 
--
CREATE TABLE HCM.HR_EMP_ASSIGNMENT
(
  ASSIGNMENT_ID         NUMBER,
  PERSON_ID             NUMBER,
  COMPANY_ID            NUMBER,
  OU_ID                 NUMBER,
  ORG_ID                NUMBER,
  POSITION_ID           NUMBER,
  PAYROLL_ID            NUMBER,
  GRADE_ID              NUMBER,
  EFFECTIVE_START_DATE  DATE,
  EFFECTIVE_END_DATE    DATE,
  STATUS                NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_GRADE  (Table) 
--
CREATE TABLE HCM.HR_GRADE
(
  ID                    NUMBER,
  GRADE                 VARCHAR2(30 BYTE),
  EFFECTIVE_START_DATE  DATE,
  EFFECTIVE_END_DATE    DATE,
  STATUS                NUMBER                  DEFAULT 1
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_HOLIDAY_CALENDER  (Table) 
--
CREATE TABLE HCM.HR_HOLIDAY_CALENDER
(
  ID               NUMBER,
  LOCATION_ID      NUMBER,
  TDATE            DATE,
  HOLIDAY_TYPE_ID  NUMBER,
  STATUS           NUMBER,
  LAST_UPDATE      TIMESTAMP(6)                 DEFAULT SYSDATE,
  UPDATED_BY       NUMBER,
  DESCRIPTION      VARCHAR2(100 BYTE)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_HOLIDAY_TYPE  (Table) 
--
CREATE TABLE HCM.HR_HOLIDAY_TYPE
(
  ID      NUMBER,
  NAME    VARCHAR2(30 BYTE),
  STATUS  NUMBER                                DEFAULT 1
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_LEAVE_TYPE  (Table) 
--
CREATE TABLE HCM.HR_LEAVE_TYPE
(
  LEAVE_TYPE_ID   NUMBER,
  CODE            VARCHAR2(50 BYTE)             NOT NULL,
  NAME            VARCHAR2(200 BYTE)            NOT NULL,
  ACCRUAL_POLICY  VARCHAR2(100 BYTE),
  MAX_BALANCE     NUMBER,
  CREATED_BY      VARCHAR2(100 BYTE),
  CREATED_DATE    TIMESTAMP(6)                  DEFAULT SYSTIMESTAMP
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_LOCATION  (Table) 
--
CREATE TABLE HCM.HR_LOCATION
(
  ID             NUMBER,
  LOCATION_NAME  VARCHAR2(100 BYTE),
  STATUS         NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_ORG  (Table) 
--
CREATE TABLE HCM.HR_ORG
(
  ID              NUMBER,
  NAME            VARCHAR2(200 BYTE)            NOT NULL,
  PARENT_ORG_ID   NUMBER,
  ORG_TYPE_ID     NUMBER,
  LOCATION        VARCHAR2(200 BYTE),
  COST_CENTER_ID  NUMBER,
  CREATED_BY      NUMBER,
  CREATED_DATE    TIMESTAMP(6)                  DEFAULT SYSTIMESTAMP,
  UPDATED_BY      NUMBER,
  UPDATED_DATE    TIMESTAMP(6),
  STATUS          NUMBER                        DEFAULT 1
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_ORG_POSITION  (Table) 
--
CREATE TABLE HCM.HR_ORG_POSITION
(
  ID                    NUMBER,
  ORG_ID                NUMBER,
  POSITION_ID           NUMBER,
  FTE                   NUMBER,
  ACTUAL_COUNT          NUMBER,
  EFFECTIVE_START_DATE  DATE,
  EFFECTIVE_END_DATE    DATE,
  STATUS                NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_ORG_TYPE  (Table) 
--
CREATE TABLE HCM.HR_ORG_TYPE
(
  ID                    NUMBER,
  ORG_TYPE              VARCHAR2(100 BYTE),
  EFFECTIVE_START_DATE  DATE,
  EFFECTIVE_END_DATE    DATE,
  STATUS                NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_PAYROLL_RUN  (Table) 
--
CREATE TABLE HCM.HR_PAYROLL_RUN
(
  PAYROLL_ID    NUMBER,
  RUN_MONTH     VARCHAR2(7 BYTE)                NOT NULL,
  RUN_DATE      DATE                            DEFAULT TRUNC(SYSDATE),
  RUN_BY        VARCHAR2(100 BYTE),
  STATUS        VARCHAR2(30 BYTE)               DEFAULT 'DRAFT',
  TOTAL_GROSS   NUMBER(18,2),
  TOTAL_NET     NUMBER(18,2),
  REMARKS       VARCHAR2(2000 BYTE),
  CREATED_DATE  TIMESTAMP(6)                    DEFAULT SYSTIMESTAMP
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_PAY_COMPONENT  (Table) 
--
CREATE TABLE HCM.HR_PAY_COMPONENT
(
  COMPONENT_ID         NUMBER,
  CODE                 VARCHAR2(50 BYTE)        NOT NULL,
  NAME                 VARCHAR2(200 BYTE)       NOT NULL,
  TYPE                 VARCHAR2(20 BYTE)        NOT NULL,
  CALCULATION_FORMULA  VARCHAR2(4000 BYTE),
  TAXABLE              VARCHAR2(3 BYTE)         DEFAULT 'YES',
  IS_PENULTIMATE       NUMBER(1)                DEFAULT 0,
  CREATED_BY           VARCHAR2(100 BYTE),
  CREATED_DATE         TIMESTAMP(6)             DEFAULT SYSTIMESTAMP,
  UPDATED_BY           VARCHAR2(100 BYTE),
  UPDATED_DATE         TIMESTAMP(6)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_PAY_STRUCTURE  (Table) 
--
CREATE TABLE HCM.HR_PAY_STRUCTURE
(
  PAY_STRUCTURE_ID  NUMBER,
  NAME              VARCHAR2(200 BYTE)          NOT NULL,
  DESCRIPTION       VARCHAR2(2000 BYTE),
  CREATED_BY        VARCHAR2(100 BYTE),
  CREATED_DATE      TIMESTAMP(6)                DEFAULT SYSTIMESTAMP,
  UPDATED_BY        VARCHAR2(100 BYTE),
  UPDATED_DATE      TIMESTAMP(6)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_PAY_STRUCTURE_COMPONENT  (Table) 
--
CREATE TABLE HCM.HR_PAY_STRUCTURE_COMPONENT
(
  PAY_STRUCTURE_ID  NUMBER                      NOT NULL,
  COMPONENT_ID      NUMBER                      NOT NULL,
  COMPONENT_ORDER   NUMBER,
  DEFAULT_VALUE     NUMBER(18,2)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_PERSON_TYPE  (Table) 
--
CREATE TABLE HCM.HR_PERSON_TYPE
(
  PERSON_TYPE_ID        NUMBER,
  PERSON_TYPE           VARCHAR2(30 BYTE),
  DESCRIPTION           VARCHAR2(50 BYTE),
  EFFECTIVE_START_DATE  DATE,
  EFFECTIVE_END_DATE    DATE,
  STATUS                NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_POSITION  (Table) 
--
CREATE TABLE HCM.HR_POSITION
(
  POSITION_ID   NUMBER,
  TITLE         VARCHAR2(200 BYTE)              NOT NULL,
  GRADE         VARCHAR2(50 BYTE),
  LEVELS        VARCHAR2(50 BYTE),
  NOTES         VARCHAR2(4000 BYTE),
  CREATED_BY    VARCHAR2(100 BYTE),
  CREATED_DATE  TIMESTAMP(6)                    DEFAULT SYSTIMESTAMP,
  UPDATED_BY    VARCHAR2(100 BYTE),
  UPDATED_DATE  TIMESTAMP(6)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_SHIFT  (Table) 
--
CREATE TABLE HCM.HR_SHIFT
(
  SHIFT_ID           NUMBER,
  CODE               VARCHAR2(50 BYTE)          NOT NULL,
  NAME               VARCHAR2(200 BYTE),
  START_TIME         VARCHAR2(10 BYTE),
  END_TIME           VARCHAR2(10 BYTE),
  GRACE_IN_MINUTES   NUMBER                     DEFAULT 0,
  GRACE_OUT_MINUTES  NUMBER                     DEFAULT 0,
  OVERNIGHT_FLAG     NUMBER(1)                  DEFAULT 0,
  CREATED_BY         VARCHAR2(100 BYTE),
  CREATED_DATE       TIMESTAMP(6)               DEFAULT SYSTIMESTAMP,
  UPDATED_BY         VARCHAR2(100 BYTE),
  UPDATED_DATE       TIMESTAMP(6)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- MODULES  (Table) 
--
CREATE TABLE HCM.MODULES
(
  ID           NUMBER,
  MODULE_NAME  VARCHAR2(100 BYTE)               NOT NULL,
  DESCRIPTION  VARCHAR2(500 BYTE),
  SEQUENCE_NO  NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- PAYSLIP_SEND_LOG  (Table) 
--
CREATE TABLE HCM.PAYSLIP_SEND_LOG
(
  ID          NUMBER,
  SEQ_NO      NUMBER,
  CHANNEL     VARCHAR2(20 BYTE),
  STATUS      VARCHAR2(30 BYTE),
  MESSAGE_ID  VARCHAR2(100 BYTE),
  ERROR_TEXT  VARCHAR2(4000 BYTE),
  SENT_AT     DATE                              DEFAULT SYSDATE
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- PERMISSIONS  (Table) 
--
CREATE TABLE HCM.PERMISSIONS
(
  ID               NUMBER,
  MODULE_ID        NUMBER                       NOT NULL,
  PERMISSION_CODE  VARCHAR2(100 BYTE)           NOT NULL,
  PERMISSION_NAME  VARCHAR2(200 BYTE)           NOT NULL,
  DESCRIPTION      VARCHAR2(500 BYTE)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- REGION_LIST  (Table) 
--
CREATE TABLE HCM.REGION_LIST
(
  REGION_ID    NUMBER,
  COUNTRY_ID   NUMBER,
  REGION_NAME  VARCHAR2(30 BYTE)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- ROLES  (Table) 
--
CREATE TABLE HCM.ROLES
(
  ID           NUMBER,
  ROLE_NAME    VARCHAR2(100 BYTE)               NOT NULL,
  DESCRIPTION  VARCHAR2(500 BYTE),
  CREATED_AT   DATE                             DEFAULT SYSDATE
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- ROLE_MODULE_VISIBILITY  (Table) 
--
CREATE TABLE HCM.ROLE_MODULE_VISIBILITY
(
  ID          NUMBER,
  ROLE_ID     NUMBER                            NOT NULL,
  MODULE_ID   NUMBER                            NOT NULL,
  IS_VISIBLE  CHAR(1 BYTE)                      DEFAULT 'Y'
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- SALE_CUSTOMERS  (Table) 
--
CREATE TABLE HCM.SALE_CUSTOMERS
(
  CUSTOMER_ID    NUMBER,
  CUSTOMER_NAME  VARCHAR2(200 BYTE)             NOT NULL,
  EMAIL          VARCHAR2(100 BYTE),
  PHONE          VARCHAR2(50 BYTE),
  ADDRESS        VARCHAR2(500 BYTE)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- SALE_INVOICE  (Table) 
--
CREATE TABLE HCM.SALE_INVOICE
(
  INVOICE_ID      NUMBER,
  INVOICE_NO      VARCHAR2(50 BYTE)             NOT NULL,
  INVOICE_DATE    DATE                          NOT NULL,
  CUSTOMER_ID     NUMBER                        NOT NULL,
  TOTAL_AMOUNT    NUMBER(12,2),
  STATUS          VARCHAR2(20 BYTE),
  PAYMENT_METHOD  VARCHAR2(50 BYTE),
  NOTES           VARCHAR2(500 BYTE)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- SALE_ITEMS  (Table) 
--
CREATE TABLE HCM.SALE_ITEMS
(
  ITEM_ID    NUMBER,
  ITEM_NAME  VARCHAR2(200 BYTE)                 NOT NULL,
  ITEM_TYPE  VARCHAR2(50 BYTE),
  PRICE      NUMBER(10,2)                       NOT NULL
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- SALE_USERS  (Table) 
--
CREATE TABLE HCM.SALE_USERS
(
  USER_ID    NUMBER,
  USERNAME   VARCHAR2(50 BYTE)                  NOT NULL,
  PASSWORD   VARCHAR2(200 BYTE)                 NOT NULL,
  FULL_NAME  VARCHAR2(100 BYTE)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- TMP_PAYSLIP  (Table) 
--
CREATE TABLE HCM.TMP_PAYSLIP
(
  SEQ_NO                NUMBER,
  MONTH_OF              DATE,
  EMP_ID                NUMBER,
  NAME                  VARCHAR2(50 BYTE),
  RELIGION              VARCHAR2(50 BYTE),
  DESIGNATION           VARCHAR2(50 BYTE),
  PQC_CODE              VARCHAR2(20 BYTE),
  ACCOUNT_NO            VARCHAR2(50 BYTE),
  GROSS_SALARY          NUMBER,
  BASIC                 NUMBER,
  HOUSERENT             NUMBER,
  MEDICAL               NUMBER,
  CONVENCE              NUMBER,
  FOOD_ALLOWANCE        NUMBER,
  WORKING_DAYS          NUMBER,
  LEAVE                 NUMBER,
  TOTAL_WORKING_DAYS    NUMBER,
  ABSENT_DAYS           NUMBER,
  ABSENT_TAKA           NUMBER,
  DUE_ON_ATTEND_SALARY  NUMBER,
  ADVANCE               NUMBER,
  WF                    NUMBER,
  MOBILE                NUMBER,
  INTERNET              NUMBER,
  CONVEYANCE            NUMBER,
  OVERTIME              NUMBER,
  TIFFIN_BILL           NUMBER,
  INCOME_TAX            NUMBER,
  NET_PAYABLE           NUMBER,
  REMARKS               VARCHAR2(100 BYTE),
  MOBILE_NO             VARCHAR2(50 BYTE),
  EMAIL                 VARCHAR2(50 BYTE),
  SEND_SMS              DATE,
  SEND_MAIL             DATE,
  STATUS                NUMBER                  DEFAULT 1,
  WHATSAPP_NO           VARCHAR2(20 BYTE),
  ARREAR                NUMBER,
  PDF_LINK              VARCHAR2(100 BYTE)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- TMP_PAYSLIP1  (Table) 
--
CREATE TABLE HCM.TMP_PAYSLIP1
(
  SEQ_NO                NUMBER,
  MONTH_OF              DATE,
  EMPLOYEE_ID           NUMBER,
  NAME                  VARCHAR2(50 BYTE),
  RELIGION              VARCHAR2(50 BYTE),
  DESIGNATION           VARCHAR2(50 BYTE),
  PQC_CODE              VARCHAR2(20 BYTE),
  BANK_ACCOUNT_NO       VARCHAR2(50 BYTE),
  GROSS_SALARY          NUMBER,
  BASIC                 NUMBER,
  HOUSERENT             NUMBER,
  MEDICAL               NUMBER,
  CONVENCE              NUMBER,
  FOOD_ALLOWANCE        NUMBER,
  WORKING_DAYS          NUMBER,
  LEAVE                 NUMBER,
  TOTAL_WORKING_DAYS    NUMBER,
  ABSENT_DAYS           NUMBER,
  ABSENT_TAKA           NUMBER,
  DUE_ON_ATTEND_SALARY  NUMBER,
  ADVANCE               NUMBER,
  WF                    NUMBER,
  MOBILE_BILL           NUMBER,
  INTERNET_BILL         NUMBER,
  TRANSPORT_BILL        NUMBER,
  OVERTIME              NUMBER,
  TIFFIN_BILL           NUMBER,
  ARREAR                NUMBER,
  OTHER_ALLOWANCE       NUMBER,
  INCOME_TAX            NUMBER,
  NET_PAYABLE           NUMBER,
  REMARKS               VARCHAR2(100 BYTE),
  MOBILE_NO             VARCHAR2(50 BYTE),
  EMAIL                 VARCHAR2(50 BYTE),
  SEND_SMS              DATE,
  SEND_MAIL             DATE,
  STATUS                NUMBER                  DEFAULT 1,
  WHATSAPP_NO           VARCHAR2(20 BYTE),
  EMAIL_SEND_TIME       DATE,
  WHATSAPP_END_TIME     DATE,
  SEQ1                  NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- TRADE_UNION  (Table) 
--
CREATE TABLE HCM.TRADE_UNION
(
  ID                    NUMBER,
  UNION_NAME            VARCHAR2(100 BYTE),
  CONTACT_NUMBER        VARCHAR2(30 BYTE),
  EFFECTIVE_START_DATE  DATE,
  EFFECTIVE_END_DATE    DATE,
  STATUS                NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- UPAZILLA_LIST  (Table) 
--
CREATE TABLE HCM.UPAZILLA_LIST
(
  UPAZILLA_ID    NUMBER,
  UPAZILLA_NAME  VARCHAR2(1 BYTE),
  DISTRICT_ID    NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- USERS  (Table) 
--
CREATE TABLE HCM.USERS
(
  ID             NUMBER,
  EMPLOYEE_ID    NUMBER,
  USERNAME       VARCHAR2(100 BYTE)             NOT NULL,
  PASSWORD_HASH  VARCHAR2(500 BYTE)             NOT NULL,
  STATUS         VARCHAR2(20 BYTE)              DEFAULT 'ACTIVE',
  CREATED_AT     DATE                           DEFAULT SYSDATE,
  UPDATED_AT     DATE
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- USER_PERMISSIONS  (Table) 
--
CREATE TABLE HCM.USER_PERMISSIONS
(
  ID             NUMBER,
  USER_ID        NUMBER                         NOT NULL,
  PERMISSION_ID  NUMBER                         NOT NULL,
  GRANTED_AT     DATE                           DEFAULT SYSDATE
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- USER_ROLES  (Table) 
--
CREATE TABLE HCM.USER_ROLES
(
  ID           NUMBER,
  USER_ID      NUMBER                           NOT NULL,
  ROLE_ID      NUMBER                           NOT NULL,
  ASSIGNED_AT  DATE                             DEFAULT SYSDATE
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- ACTIVITY_LOG_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.ACTIVITY_LOG_SEQ
  START WITH 1
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_ATTENDANCE_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_ATTENDANCE_SEQ
  START WITH 100003
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_AUDIT_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_AUDIT_SEQ
  START WITH 1
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_COMPANY_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_COMPANY_SEQ
  START WITH 1
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- HR_CONTRACT_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_CONTRACT_SEQ
  START WITH 50001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_DEPARTMENT_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_DEPARTMENT_SEQ
  START WITH 1001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_EMPLOYEES_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_EMPLOYEES_SEQ
  START WITH 10001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_EMPLOYEE_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_EMPLOYEE_SEQ
  START WITH 121
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- HR_EMP_ADDRESS_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_EMP_ADDRESS_SEQ
  START WITH 1
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- HR_EMP_ASSIGNMENT_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_EMP_ASSIGNMENT_SEQ
  START WITH 1
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- HR_EMP_NO  (Sequence) 
--
CREATE SEQUENCE HCM.HR_EMP_NO
  START WITH 29
  MAXVALUE 9999999999999999999999999999
  MINVALUE 2
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_GRADE_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_GRADE_SEQ
  START WITH 1
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- HR_LEAVE_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_LEAVE_SEQ
  START WITH 400001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_LOAN_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_LOAN_SEQ
  START WITH 800001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_LOCATION_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_LOCATION_SEQ
  START WITH 1
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- HR_ORG_POSITION_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_ORG_POSITION_SEQ
  START WITH 21
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- HR_ORG_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_ORG_SEQ
  START WITH 41
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- HR_ORG_TYPE_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_ORG_TYPE_SEQ
  START WITH 1
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- HR_PAYROLL_RUN_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_PAYROLL_RUN_SEQ
  START WITH 7001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_PAYSLIP_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_PAYSLIP_SEQ
  START WITH 900001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_PAY_COMPONENT_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_PAY_COMPONENT_SEQ
  START WITH 6001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_PAY_STRUCTURE_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_PAY_STRUCTURE_SEQ
  START WITH 2001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_PERF_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_PERF_SEQ
  START WITH 1100001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_PERSON_TYPE_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_PERSON_TYPE_SEQ
  START WITH 1
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- HR_PF_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_PF_SEQ
  START WITH 1000001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_POSITION_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_POSITION_SEQ
  START WITH 1001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- HR_SHIFT_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.HR_SHIFT_SEQ
  START WITH 3001
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- MODULES_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.MODULES_SEQ
  START WITH 11
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- PAYSLIP_SEND_LOG_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.PAYSLIP_SEND_LOG_SEQ
  START WITH 1
  MAXVALUE 999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- PERMISSIONS_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.PERMISSIONS_SEQ
  START WITH 43
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- ROLES_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.ROLES_SEQ
  START WITH 5
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- ROLE_MODULE_VISIBILITY_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.ROLE_MODULE_VISIBILITY_SEQ
  START WITH 1
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- ROLE_PERMISSIONS_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.ROLE_PERMISSIONS_SEQ
  START WITH 94
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- SALE_CUSTOMERS_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.SALE_CUSTOMERS_SEQ
  START WITH 3
  MAXVALUE 9999999999999999999999999999
  MINVALUE 0
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- SALE_INVOICE_ITEMS_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.SALE_INVOICE_ITEMS_SEQ
  START WITH 4
  MAXVALUE 9999999999999999999999999999
  MINVALUE 0
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- SALE_INVOICE_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.SALE_INVOICE_SEQ
  START WITH 3
  MAXVALUE 9999999999999999999999999999
  MINVALUE 0
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- SALE_ITEMS_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.SALE_ITEMS_SEQ
  START WITH 4
  MAXVALUE 9999999999999999999999999999
  MINVALUE 0
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- SEQ_USERS  (Sequence) 
--
CREATE SEQUENCE HCM.SEQ_USERS
  START WITH 1
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  CACHE 20
  NOORDER;


--
-- USERS_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.USERS_SEQ
  START WITH 3
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- USER_PERMISSIONS_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.USER_PERMISSIONS_SEQ
  START WITH 1
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- USER_ROLES_SEQ  (Sequence) 
--
CREATE SEQUENCE HCM.USER_ROLES_SEQ
  START WITH 4
  MAXVALUE 9999999999999999999999999999
  MINVALUE 1
  NOCYCLE
  NOCACHE
  NOORDER;


--
-- COUNTRY_LIST_PK  (Index) 
--
CREATE UNIQUE INDEX HCM.COUNTRY_LIST_PK ON HCM.COUNTRY_LIST
(COUNTRY_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- GRADE_LIST_PK  (Index) 
--
CREATE UNIQUE INDEX HCM.GRADE_LIST_PK ON HCM.HR_GRADE
(ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- HR_EMPLOYEE_PK  (Index) 
--
CREATE UNIQUE INDEX HCM.HR_EMPLOYEE_PK ON HCM.HR_EMPLOYEE
(PERSON_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- HR_EMPLOYEE_U01  (Index) 
--
CREATE UNIQUE INDEX HCM.HR_EMPLOYEE_U01 ON HCM.HR_EMPLOYEE
(EMP_NO)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- HR_EMP_ASSIGNMENT_PK  (Index) 
--
CREATE UNIQUE INDEX HCM.HR_EMP_ASSIGNMENT_PK ON HCM.HR_EMP_ASSIGNMENT
(ASSIGNMENT_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- HR_ORG_PK  (Index) 
--
CREATE UNIQUE INDEX HCM.HR_ORG_PK ON HCM.HR_ORG
(ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- HR_ORG_TYPE_PK  (Index) 
--
CREATE UNIQUE INDEX HCM.HR_ORG_TYPE_PK ON HCM.HR_ORG_TYPE
(ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- HR_PERSON_TYPE_PK  (Index) 
--
CREATE UNIQUE INDEX HCM.HR_PERSON_TYPE_PK ON HCM.HR_PERSON_TYPE
(PERSON_TYPE_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_MODULES_NAME  (Index) 
--
CREATE UNIQUE INDEX HCM.IDX_MODULES_NAME ON HCM.MODULES
(MODULE_NAME)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_PERMISSIONS_CODE  (Index) 
--
CREATE UNIQUE INDEX HCM.IDX_PERMISSIONS_CODE ON HCM.PERMISSIONS
(PERMISSION_CODE)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_PERMISSIONS_MODULE  (Index) 
--
CREATE INDEX HCM.IDX_PERMISSIONS_MODULE ON HCM.PERMISSIONS
(MODULE_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_PS_RUN_MONTH  (Index) 
--
CREATE INDEX HCM.IDX_PS_RUN_MONTH ON HCM.HR_PAYROLL_RUN
(RUN_MONTH)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_RM_VISIBILITY_MODULE  (Index) 
--
CREATE INDEX HCM.IDX_RM_VISIBILITY_MODULE ON HCM.ROLE_MODULE_VISIBILITY
(MODULE_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_RM_VISIBILITY_ROLE  (Index) 
--
CREATE INDEX HCM.IDX_RM_VISIBILITY_ROLE ON HCM.ROLE_MODULE_VISIBILITY
(ROLE_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_ROLES_NAME  (Index) 
--
CREATE UNIQUE INDEX HCM.IDX_ROLES_NAME ON HCM.ROLES
(ROLE_NAME)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_USER_PERMISSIONS_PERM  (Index) 
--
CREATE INDEX HCM.IDX_USER_PERMISSIONS_PERM ON HCM.USER_PERMISSIONS
(PERMISSION_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_USER_PERMISSIONS_USER  (Index) 
--
CREATE INDEX HCM.IDX_USER_PERMISSIONS_USER ON HCM.USER_PERMISSIONS
(USER_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_USER_ROLES_ROLE  (Index) 
--
CREATE INDEX HCM.IDX_USER_ROLES_ROLE ON HCM.USER_ROLES
(ROLE_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_USER_ROLES_USER  (Index) 
--
CREATE INDEX HCM.IDX_USER_ROLES_USER ON HCM.USER_ROLES
(USER_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- UPAZILLA_LIST_PK  (Index) 
--
CREATE UNIQUE INDEX HCM.UPAZILLA_LIST_PK ON HCM.UPAZILLA_LIST
(UPAZILLA_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- HRMS_AUDIT_RECORD  (Procedure) 
--
CREATE OR REPLACE PROCEDURE HCM.hrms_audit_record(p_table_name VARCHAR2, p_operation VARCHAR2, p_key_vals VARCHAR2, p_old CLOB, p_new CLOB) AS
  v_audit_id NUMBER;
BEGIN
  SELECT hr_audit_seq.NEXTVAL INTO v_audit_id FROM DUAL;
  INSERT INTO hr_audit_log(audit_id, table_name, operation, changed_by, changed_on, key_values, old_values, new_values)
  VALUES (v_audit_id, p_table_name, p_operation, SYS_CONTEXT('USERENV','SESSION_USER'), SYSTIMESTAMP, p_key_vals, p_old, p_new);
  COMMIT;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- avoid breaking transaction. In prod, handle errors appropriately.
END hrms_audit_record;
/

--
-- HR_WORKING_DAYS  (Function) 
--
CREATE OR REPLACE FUNCTION HCM.hr_working_days(p_from DATE, p_to DATE) RETURN NUMBER IS
  v_days NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_days FROM (
    SELECT trunc(p_from) + level - 1 AS d FROM dual CONNECT BY level <= (trunc(p_to) - trunc(p_from) + 1)
  ) WHERE TO_CHAR(d,'DY','NLS_DATE_LANGUAGE=ENGLISH') NOT IN ('SAT','SUN');
  RETURN v_days;
END;
/

--
-- TAKA_INWORDS  (Function) 
--
CREATE OR REPLACE FUNCTION HCM.taka_inwords (p_number IN NUMBER)
   RETURN VARCHAR2
IS
   v_total_amount     NUMBER;
   v_whole_taka       NUMBER;
   v_paisa_amount     NUMBER;
   v_taka_string      VARCHAR2 (32767) := '';
   v_paisa_string     VARCHAR2 (32767) := '';
   v_final_string     VARCHAR2 (32767) := '';

   -- Variables for South Asian numbering chunks
   v_crore            NUMBER;
   v_lakh             NUMBER;
   v_thousand         NUMBER;
   v_hundred_part     NUMBER;

   -- Helper internal function to convert small chunks (0-9999999) using JSP
   FUNCTION chunk_to_words (p_chunk IN NUMBER) RETURN VARCHAR2 IS
   BEGIN
       IF p_chunk IS NULL OR p_chunk = 0 THEN RETURN NULL; END IF;
       -- The 'JSP' (Julian Spelled Out) format is a classic Oracle trick
       -- to convert numbers to words.
       RETURN TO_CHAR (TO_DATE (p_chunk, 'J'), 'JSP');
   EXCEPTION WHEN OTHERS THEN
       -- Handle cases where chunk might exceed JSP limits (rare for typical currency chunks)
       RETURN NULL;
   END;

BEGIN
   -- 1. Handle basic input validations
   IF p_number IS NULL THEN
      RETURN NULL;
   END IF;

   IF p_number = 0 THEN
      RETURN 'Zero Taka Only';
   END IF;

   -- Keep positive value for calculation, handle negative sign later if needed
   v_total_amount := ABS (ROUND (p_number, 2));

   -- 2. Separate Whole Taka and Paisa parts
   v_whole_taka := TRUNC (v_total_amount);
   -- Calculate Paisa: subtract whole part, multiply by 100, round to nearest integer
   v_paisa_amount := ROUND ((v_total_amount - v_whole_taka) * 100);


   -- 3. Process Taka Part (The South Asian Logic)
   IF v_whole_taka > 0 THEN
      -- Calculate Crores (1,00,00,000)
      v_crore := TRUNC (v_whole_taka / 10000000);
      v_whole_taka := MOD (v_whole_taka, 10000000); -- Remainder remaining

      -- Calculate Lakhs (1,00,000)
      v_lakh := TRUNC (v_whole_taka / 100000);
      v_whole_taka := MOD (v_whole_taka, 100000); -- Remainder remaining

      -- Calculate Thousands (1,000)
      v_thousand := TRUNC (v_whole_taka / 1000);
      v_hundred_part := MOD (v_whole_taka, 1000); -- The final remaining hundreds part

      -- Build the string by converting chunks and appending units
      IF v_crore > 0 THEN
         v_taka_string := v_taka_string || ' ' || chunk_to_words(v_crore) || ' Crore';
      END IF;

      IF v_lakh > 0 THEN
         v_taka_string := v_taka_string || ' ' || chunk_to_words(v_lakh) || ' Lakh';
      END IF;

      IF v_thousand > 0 THEN
         v_taka_string := v_taka_string || ' ' || chunk_to_words(v_thousand) || ' Thousand';
      END IF;

      IF v_hundred_part > 0 THEN
         v_taka_string := v_taka_string || ' ' || chunk_to_words(v_hundred_part);
      END IF;

       -- Add the currency name
      v_taka_string := TRIM(v_taka_string) || ' Taka';
   END IF;


   -- 4. Process Paisa Part
   IF v_paisa_amount > 0 THEN
      v_paisa_string := chunk_to_words(v_paisa_amount) || ' Paisa';
   END IF;


   -- 5. Combine Taka and Paisa strings nicely
   IF v_taka_string IS NOT NULL AND v_paisa_string IS NOT NULL THEN
       -- e.g., "One Hundred Taka and Fifty Paisa"
       v_final_string := v_taka_string || ' and ' || v_paisa_string;
   ELSIF v_taka_string IS NOT NULL THEN
       -- e.g., "One Hundred Taka"
       v_final_string := v_taka_string;
   ELSIF v_paisa_string IS NOT NULL THEN
       -- e.g., "Fifty Paisa" (case where input is like 0.50)
       v_final_string := v_paisa_string;
   END IF;

   -- 6. Final formatting (Initcap for readability and adding "Only")
   -- Using REPLACE to clean up any potential double spaces created during concatenation
   v_final_string := INITCAP(REPLACE(TRIM(v_final_string), '  ', ' ')) || ' Only';

   -- Handle negative inputs if necessary
   IF p_number < 0 THEN
       v_final_string := 'Minus ' || v_final_string;
   END IF;

   RETURN v_final_string;

EXCEPTION
   WHEN OTHERS THEN
      RETURN 'Error Converting Number to Taka: ' || SQLERRM;
END taka_inwords;
/

--
-- TAKA_IN_WORDS  (Function) 
--
CREATE OR REPLACE FUNCTION HCM.taka_in_words (p_amount NUMBER)
RETURN VARCHAR2
IS
   -------------------------------------------------------------------
   -- PURE number-to-words function (does NOT add �Taka� or �Paisa�)
   -------------------------------------------------------------------
   FUNCTION num_words(n NUMBER) RETURN VARCHAR2 IS
      w VARCHAR2(4000);
      x NUMBER;
   BEGIN
      IF n = 0 THEN
         RETURN '';
      ELSIF n < 20 THEN
         RETURN
            CASE n
               WHEN 1 THEN 'One'
               WHEN 2 THEN 'Two'
               WHEN 3 THEN 'Three'
               WHEN 4 THEN 'Four'
               WHEN 5 THEN 'Five'
               WHEN 6 THEN 'Six'
               WHEN 7 THEN 'Seven'
               WHEN 8 THEN 'Eight'
               WHEN 9 THEN 'Nine'
               WHEN 10 THEN 'Ten'
               WHEN 11 THEN 'Eleven'
               WHEN 12 THEN 'Twelve'
               WHEN 13 THEN 'Thirteen'
               WHEN 14 THEN 'Fourteen'
               WHEN 15 THEN 'Fifteen'
               WHEN 16 THEN 'Sixteen'
               WHEN 17 THEN 'Seventeen'
               WHEN 18 THEN 'Eighteen'
               WHEN 19 THEN 'Nineteen'
            END;
      ELSIF n < 100 THEN
         w :=
            CASE FLOOR(n/10)
               WHEN 2 THEN 'Twenty'
               WHEN 3 THEN 'Thirty'
               WHEN 4 THEN 'Forty'
               WHEN 5 THEN 'Fifty'
               WHEN 6 THEN 'Sixty'
               WHEN 7 THEN 'Seventy'
               WHEN 8 THEN 'Eighty'
               WHEN 9 THEN 'Ninety'
            END;

         IF MOD(n,10) > 0 THEN
            w := w || ' ' || num_words(MOD(n,10));
         END IF;

         RETURN w;
      ELSIF n < 1000 THEN
         w := num_words(FLOOR(n/100)) || ' Hundred';
         IF MOD(n,100) > 0 THEN
            w := w || ' ' || num_words(MOD(n,100));
         END IF;
         RETURN w;
      ELSIF n < 100000 THEN
         w := num_words(FLOOR(n/1000)) || ' Thousand';
         IF MOD(n,1000) > 0 THEN
            w := w || ' ' || num_words(MOD(n,1000));
         END IF;
         RETURN w;
      ELSIF n < 10000000 THEN
         w := num_words(FLOOR(n/100000)) || ' Lakh';
         IF MOD(n,100000) > 0 THEN
            w := w || ' ' || num_words(MOD(n,100000));
         END IF;
         RETURN w;
      ELSE
         w := num_words(FLOOR(n/10000000)) || ' Crore';
         IF MOD(n,10000000) > 0 THEN
            w := w || ' ' || num_words(MOD(n,10000000));
         END IF;
         RETURN w;
      END IF;
   END num_words;
   -------------------------------------------------------------------

   v_taka  NUMBER := FLOOR(p_amount);
   v_paisa NUMBER := ROUND((p_amount - v_taka) * 100);
   v_text  VARCHAR2(4000);
BEGIN
   IF p_amount = 0 THEN
      RETURN 'Zero Taka Only';
   END IF;

   ------------------------------------------
   -- Build Taka part
   ------------------------------------------
   v_text := TRIM(num_words(v_taka)) || ' Taka';

   ------------------------------------------
   -- Add Paisa part
   ------------------------------------------
   IF v_paisa > 0 THEN
      v_text := v_text || ' and ' || TRIM(num_words(v_paisa)) || ' Paisa';
   END IF;

   RETURN v_text || ' Only';
END taka_in_words;
/

--
-- TAKA_WORDS  (Function) 
--
CREATE OR REPLACE FUNCTION HCM.taka_words (p_number IN NUMBER)
   RETURN VARCHAR2
IS
   v_total_amount     NUMBER;
   v_whole_taka       NUMBER;
   v_paisa_amount     NUMBER;
   v_taka_string      VARCHAR2 (32767) := '';
   v_paisa_string     VARCHAR2 (32767) := '';
   v_final_string     VARCHAR2 (32767) := '';

   -- Variables for South Asian numbering chunks
   v_crore            NUMBER;
   v_lakh             NUMBER;
   v_thousand         NUMBER;
   v_hundred_part     NUMBER;

   -- Helper internal function to convert small chunks (0-9999999) using JSP
   FUNCTION chunk_to_words (p_chunk IN NUMBER) RETURN VARCHAR2 IS
   BEGIN
       IF p_chunk IS NULL OR p_chunk = 0 THEN RETURN NULL; END IF;
       -- The 'JSP' (Julian Spelled Out) format is a classic Oracle trick
       -- to convert numbers to words.
       RETURN TO_CHAR (TO_DATE (p_chunk, 'J'), 'JSP');
   EXCEPTION WHEN OTHERS THEN
       -- Handle cases where chunk might exceed JSP limits (rare for typical currency chunks)
       RETURN NULL;
   END;

BEGIN
   -- 1. Handle basic input validations
   IF p_number IS NULL THEN
      RETURN NULL;
   END IF;

   IF p_number = 0 THEN
      RETURN 'Zero Taka Only';
   END IF;

   -- Keep positive value for calculation, handle negative sign later if needed
   v_total_amount := ABS (ROUND (p_number, 2));

   -- 2. Separate Whole Taka and Paisa parts
   v_whole_taka := TRUNC (v_total_amount);
   -- Calculate Paisa: subtract whole part, multiply by 100, round to nearest integer
   v_paisa_amount := ROUND ((v_total_amount - v_whole_taka) * 100);


   -- 3. Process Taka Part (The South Asian Logic)
   IF v_whole_taka > 0 THEN
      -- Calculate Crores (1,00,00,000)
      v_crore := TRUNC (v_whole_taka / 10000000);
      v_whole_taka := MOD (v_whole_taka, 10000000); -- Remainder remaining

      -- Calculate Lakhs (1,00,000)
      v_lakh := TRUNC (v_whole_taka / 100000);
      v_whole_taka := MOD (v_whole_taka, 100000); -- Remainder remaining

      -- Calculate Thousands (1,000)
      v_thousand := TRUNC (v_whole_taka / 1000);
      v_hundred_part := MOD (v_whole_taka, 1000); -- The final remaining hundreds part

      -- Build the string by converting chunks and appending units
      IF v_crore > 0 THEN
         v_taka_string := v_taka_string || ' ' || chunk_to_words(v_crore) || ' Crore';
      END IF;

      IF v_lakh > 0 THEN
         v_taka_string := v_taka_string || ' ' || chunk_to_words(v_lakh) || ' Lakh';
      END IF;

      IF v_thousand > 0 THEN
         v_taka_string := v_taka_string || ' ' || chunk_to_words(v_thousand) || ' Thousand';
      END IF;

      IF v_hundred_part > 0 THEN
         v_taka_string := v_taka_string || ' ' || chunk_to_words(v_hundred_part);
      END IF;

       -- Add the currency name
      v_taka_string := TRIM(v_taka_string) || ' Taka';
   END IF;


   -- 4. Process Paisa Part
   IF v_paisa_amount > 0 THEN
      v_paisa_string := chunk_to_words(v_paisa_amount) || ' Paisa';
   END IF;


   -- 5. Combine Taka and Paisa strings nicely
   IF v_taka_string IS NOT NULL AND v_paisa_string IS NOT NULL THEN
       -- e.g., "One Hundred Taka and Fifty Paisa"
       v_final_string := v_taka_string || ' and ' || v_paisa_string;
   ELSIF v_taka_string IS NOT NULL THEN
       -- e.g., "One Hundred Taka"
       v_final_string := v_taka_string;
   ELSIF v_paisa_string IS NOT NULL THEN
       -- e.g., "Fifty Paisa" (case where input is like 0.50)
       v_final_string := v_paisa_string;
   END IF;

   -- 6. Final formatting (Initcap for readability and adding "Only")
   -- Using REPLACE to clean up any potential double spaces created during concatenation
   v_final_string := INITCAP(REPLACE(TRIM(v_final_string), '  ', ' ')) || ' Only';

   -- Handle negative inputs if necessary
   IF p_number < 0 THEN
       v_final_string := 'Minus ' || v_final_string;
   END IF;

   RETURN v_final_string;

EXCEPTION
   WHEN OTHERS THEN
      RETURN 'Error Converting Number to Taka: ' || SQLERRM;
END num_to_taka_words;
/

--
-- VW_USER_DIRECT_PERMISSIONS  (View) 
--
CREATE OR REPLACE FORCE VIEW HCM.VW_USER_DIRECT_PERMISSIONS
(USER_ID, USERNAME, ROLE_ID, ROLE_NAME, PERMISSION_ID, 
 PERMISSION_CODE, PERMISSION_NAME, MODULE_ID)
AS 
SELECT
    u.id AS user_id,
    u.username,
    NULL AS role_id,           -- Placeholder to match structure
    NULL AS role_name,         -- Placeholder to match structure
    p.id AS permission_id,
    p.permission_code,
    p.permission_name,
    p.module_id
FROM users u
JOIN user_permissions up
    ON u.id = up.user_id
JOIN permissions p
    ON up.permission_id = p.id;


--
-- HR_COMPANY_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.HR_COMPANY_TRG
BEFORE INSERT
ON HCM.HR_COMPANY
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column COMPANY_ID
  :new.COMPANY_ID := HR_COMPANY_SEQ.nextval;
END HR_COMPANY_TRG;
/


--
-- HR_EMPLOYEE_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.HR_EMPLOYEE_TRG
BEFORE INSERT
ON HCM.HR_EMPLOYEE
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column PERSON_ID
  :new.PERSON_ID := HR_EMPLOYEE_SEQ.nextval;
END HR_EMPLOYEE_TRG;
/


--
-- HR_EMP_ADDRESS_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.HR_EMP_ADDRESS_TRG
BEFORE INSERT
ON HCM.HR_EMP_ADDRESS
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column PERSON_ID
  :new.PERSON_ID := HR_EMP_ADDRESS_SEQ.nextval;
END HR_EMP_ADDRESS_TRG;
/


--
-- HR_EMP_ASSIGNMENT_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.HR_EMP_ASSIGNMENT_TRG
BEFORE INSERT
ON HCM.HR_EMP_ASSIGNMENT
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ASSIGNMENT_ID
  :new.ASSIGNMENT_ID := HR_EMP_ASSIGNMENT_SEQ.nextval;
END HR_EMP_ASSIGNMENT_TRG;
/


--
-- HR_GRADE_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.HR_GRADE_TRG
BEFORE INSERT
ON HCM.HR_GRADE
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := HR_GRADE_SEQ.nextval;
END HR_GRADE_TRG;
/


--
-- HR_LOCATION_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.HR_LOCATION_TRG
BEFORE INSERT
ON HCM.HR_LOCATION
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := HR_LOCATION_SEQ.nextval;
END HR_LOCATION_TRG;
/


--
-- HR_ORG_POSITION_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.HR_ORG_POSITION_TRG
BEFORE INSERT
ON HCM.HR_ORG_POSITION
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := HR_ORG_POSITION_SEQ.nextval;
END HR_ORG_POSITION_TRG;
/


--
-- HR_ORG_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.HR_ORG_TRG
BEFORE INSERT
ON HCM.HR_ORG
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := HR_ORG_SEQ.nextval;
END HR_ORG_TRG;
/


--
-- HR_ORG_TYPE_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.HR_ORG_TYPE_TRG
BEFORE INSERT
ON HCM.HR_ORG_TYPE
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := HR_ORG_TYPE_SEQ.nextval;
END HR_ORG_TYPE_TRG;
/


--
-- HR_PERSON_TYPE_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.HR_PERSON_TYPE_TRG
BEFORE INSERT
ON HCM.HR_PERSON_TYPE
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column PERSON_TYPE_ID
  :new.PERSON_TYPE_ID := HR_PERSON_TYPE_SEQ.nextval;
END HR_PERSON_TYPE_TRG;
/


--
-- PAYSLIP_SEND_LOG_TRG  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.PAYSLIP_SEND_LOG_TRG
BEFORE INSERT
ON HCM.PAYSLIP_SEND_LOG
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
BEGIN
-- For Toad:  Highlight column ID
  :new.ID := PAYSLIP_SEND_LOG_SEQ.nextval;
END PAYSLIP_SEND_LOG_TRG;
/


--
-- TRG_AUDIT_HR_PAYROLL_RUN  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_audit_hr_payroll_run
AFTER INSERT OR UPDATE OR DELETE ON HCM.HR_PAYROLL_RUN
FOR EACH ROW
DECLARE
  v_old CLOB;
  v_new CLOB;
  v_key VARCHAR2(200);
BEGIN
  IF INSERTING THEN
    v_new := 'RUN_MONTH='||:NEW.run_month||';STATUS='||:NEW.status;
    v_key := 'PR='||:NEW.payroll_id;
    hrms_audit_record('HR_PAYROLL_RUN','INSERT',v_key,null,v_new);
  ELSIF UPDATING THEN
    v_old := 'RUN_MONTH='||:OLD.run_month||';STATUS='||:OLD.status;
    v_new := 'RUN_MONTH='||:NEW.run_month||';STATUS='||:NEW.status;
    v_key := 'PR='||NVL(:NEW.payroll_id,:OLD.payroll_id);
    hrms_audit_record('HR_PAYROLL_RUN','UPDATE',v_key,v_old,v_new);
  ELSIF DELETING THEN
    v_old := 'RUN_MONTH='||:OLD.run_month||';STATUS='||:OLD.status;
    v_key := 'PR='||:OLD.payroll_id;
    hrms_audit_record('HR_PAYROLL_RUN','DELETE',v_key,v_old,null);
  END IF;
END;
/


--
-- TRG_DEPT_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_dept_bi
BEFORE INSERT ON HCM.HR_DEPARTMENT
FOR EACH ROW
BEGIN
  IF :NEW.department_id IS NULL THEN
    SELECT hr_department_seq.NEXTVAL INTO :NEW.department_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
  :NEW.updated_date := SYSTIMESTAMP;
END;
/


--
-- TRG_MODULES_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_modules_id
BEFORE INSERT ON HCM.MODULES
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT modules_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_PAYROLL_RUN_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_payroll_run_bi
BEFORE INSERT ON HCM.HR_PAYROLL_RUN
FOR EACH ROW
BEGIN
  IF :NEW.payroll_id IS NULL THEN
    SELECT hr_payroll_run_seq.NEXTVAL INTO :NEW.payroll_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
END;
/


--
-- TRG_PAY_COMPONENT_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_pay_component_bi
BEFORE INSERT ON HCM.HR_PAY_COMPONENT
FOR EACH ROW
BEGIN
  IF :NEW.component_id IS NULL THEN
    SELECT hr_pay_component_seq.NEXTVAL INTO :NEW.component_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
  :NEW.updated_date := SYSTIMESTAMP;
END;
/


--
-- TRG_PAY_STRUCTURE_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_pay_structure_bi
BEFORE INSERT ON HCM.HR_PAY_STRUCTURE
FOR EACH ROW
BEGIN
  IF :NEW.pay_structure_id IS NULL THEN
    SELECT hr_pay_structure_seq.NEXTVAL INTO :NEW.pay_structure_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
  :NEW.updated_date := SYSTIMESTAMP;
END;
/


--
-- TRG_PERMISSIONS_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_permissions_id
BEFORE INSERT ON HCM.PERMISSIONS
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT permissions_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_POSITION_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_position_bi
BEFORE INSERT ON HCM.HR_POSITION
FOR EACH ROW
BEGIN
  IF :NEW.position_id IS NULL THEN
    SELECT hr_position_seq.NEXTVAL INTO :NEW.position_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
  :NEW.updated_date := SYSTIMESTAMP;
END;
/


--
-- TRG_ROLES_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_roles_id
BEFORE INSERT ON HCM.ROLES
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT roles_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_ROLE_MODULE_VISIBILITY_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_role_module_visibility_id
BEFORE INSERT ON HCM.ROLE_MODULE_VISIBILITY
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT role_module_visibility_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_SHIFT_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_shift_bi
BEFORE INSERT ON HCM.HR_SHIFT
FOR EACH ROW
BEGIN
  IF :NEW.shift_id IS NULL THEN
    SELECT hr_shift_seq.NEXTVAL INTO :NEW.shift_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
  :NEW.updated_date := SYSTIMESTAMP;
END;
/


--
-- TRG_USERS_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_users_id
BEFORE INSERT ON HCM.USERS
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT users_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_USERS_PK  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_users_pk
BEFORE INSERT ON HCM.USERS
FOR EACH ROW
BEGIN
   IF :new.id IS NULL THEN
      SELECT seq_users.NEXTVAL INTO :new.id FROM dual;
   END IF;
END;
/


--
-- TRG_USER_PERMISSIONS_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_user_permissions_id
BEFORE INSERT ON HCM.USER_PERMISSIONS
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT user_permissions_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_USER_ROLES_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_user_roles_id
BEFORE INSERT ON HCM.USER_ROLES
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT user_roles_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- UPD_FILENO  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.UPD_FILENO
BEFORE INSERT
ON HCM.TMP_PAYSLIP
REFERENCING NEW AS New OLD AS Old
FOR EACH ROW
begin
:new.pdf_link :=:new.seq_no || to_char(:new.month_of,'yymm')||:new.emp_id ||'.pdf';

end;
/


--
-- ACTIVITY_LOG  (Table) 
--
CREATE TABLE HCM.ACTIVITY_LOG
(
  ID                  NUMBER,
  USER_ID             NUMBER,
  ACTION_TYPE         VARCHAR2(100 BYTE),
  ACTION_DESCRIPTION  VARCHAR2(500 BYTE),
  IP_ADDRESS          VARCHAR2(50 BYTE),
  CREATED_AT          DATE                      DEFAULT SYSDATE
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_EMPLOYEES  (Table) 
--
CREATE TABLE HCM.HR_EMPLOYEES
(
  EMPLOYEE_ID          NUMBER,
  EMPLOYEE_NUMBER      VARCHAR2(30 BYTE)        NOT NULL,
  FIRST_NAME           VARCHAR2(100 BYTE)       NOT NULL,
  LAST_NAME            VARCHAR2(100 BYTE),
  FULL_NAME            VARCHAR2(201 BYTE) Generated Always as ("FIRST_NAME"||' '||NVL("LAST_NAME",'')),
  DOB                  DATE,
  GENDER               VARCHAR2(20 BYTE),
  NATIONAL_ID          VARCHAR2(100 BYTE),
  PASSPORT_NO          VARCHAR2(50 BYTE),
  EMAIL                VARCHAR2(200 BYTE),
  PHONE                VARCHAR2(50 BYTE),
  JOIN_DATE            DATE,
  PROBATION_END_DATE   DATE,
  TERMINATION_DATE     DATE,
  STATUS               VARCHAR2(30 BYTE)        DEFAULT 'ACTIVE',
  POSITION_ID          NUMBER,
  DEPARTMENT_ID        NUMBER,
  MANAGER_ID           NUMBER,
  COST_CENTER          VARCHAR2(100 BYTE),
  LOCATION             VARCHAR2(200 BYTE),
  BANK_ACCOUNT_NO      VARCHAR2(100 BYTE),
  BANK_NAME            VARCHAR2(200 BYTE),
  TAX_ID               VARCHAR2(100 BYTE),
  SALARY_STRUCTURE_ID  NUMBER,
  CREATED_BY           VARCHAR2(100 BYTE),
  CREATED_DATE         TIMESTAMP(6)             DEFAULT SYSTIMESTAMP,
  UPDATED_BY           VARCHAR2(100 BYTE),
  UPDATED_DATE         TIMESTAMP(6)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_LEAVE_BALANCE  (Table) 
--
CREATE TABLE HCM.HR_LEAVE_BALANCE
(
  EMPLOYEE_ID    NUMBER                         NOT NULL,
  LEAVE_TYPE_ID  NUMBER                         NOT NULL,
  YEAR           NUMBER(4)                      NOT NULL,
  ENTITLEMENT    NUMBER,
  USED           NUMBER                         DEFAULT 0,
  BALANCE        NUMBER
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_LEAVE_REQUEST  (Table) 
--
CREATE TABLE HCM.HR_LEAVE_REQUEST
(
  LEAVE_ID       NUMBER,
  EMPLOYEE_ID    NUMBER                         NOT NULL,
  LEAVE_TYPE_ID  NUMBER                         NOT NULL,
  START_DATE     DATE                           NOT NULL,
  END_DATE       DATE                           NOT NULL,
  DAYS           NUMBER,
  REASON         VARCHAR2(2000 BYTE),
  STATUS         VARCHAR2(30 BYTE)              DEFAULT 'PENDING',
  APPLIED_ON     TIMESTAMP(6)                   DEFAULT SYSTIMESTAMP,
  APPROVER_ID    NUMBER,
  APPROVED_ON    TIMESTAMP(6),
  CREATED_BY     VARCHAR2(100 BYTE),
  CREATED_DATE   TIMESTAMP(6)                   DEFAULT SYSTIMESTAMP,
  UPDATED_BY     VARCHAR2(100 BYTE),
  UPDATED_DATE   TIMESTAMP(6)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_LOAN  (Table) 
--
CREATE TABLE HCM.HR_LOAN
(
  LOAN_ID             NUMBER,
  EMPLOYEE_ID         NUMBER                    NOT NULL,
  LOAN_TYPE           VARCHAR2(100 BYTE),
  PRINCIPAL_AMOUNT    NUMBER(18,2)              NOT NULL,
  INTEREST_RATE       NUMBER(5,2),
  TERM_MONTHS         NUMBER,
  MONTHLY_DEDUCTION   NUMBER(18,2),
  START_DATE          DATE,
  END_DATE            DATE,
  OUTSTANDING_AMOUNT  NUMBER(18,2),
  STATUS              VARCHAR2(30 BYTE)         DEFAULT 'ACTIVE',
  CREATED_BY          VARCHAR2(100 BYTE),
  CREATED_DATE        TIMESTAMP(6)              DEFAULT SYSTIMESTAMP
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_PAYSLIP  (Table) 
--
CREATE TABLE HCM.HR_PAYSLIP
(
  PAYSLIP_ID    NUMBER,
  PAYROLL_ID    NUMBER                          NOT NULL,
  EMPLOYEE_ID   NUMBER                          NOT NULL,
  GROSS         NUMBER(18,2),
  NET           NUMBER(18,2),
  TAX           NUMBER(18,2),
  DEDUCTIONS    NUMBER(18,2),
  PAYSLIP_BLOB  BLOB,
  PAYSLIP_PATH  VARCHAR2(4000 BYTE),
  CREATED_DATE  TIMESTAMP(6)                    DEFAULT SYSTIMESTAMP
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_PERFORMANCE_REVIEW  (Table) 
--
CREATE TABLE HCM.HR_PERFORMANCE_REVIEW
(
  REVIEW_ID     NUMBER,
  EMPLOYEE_ID   NUMBER                          NOT NULL,
  PERIOD_FROM   DATE,
  PERIOD_TO     DATE,
  REVIEWER_ID   NUMBER,
  SCORES        CLOB,
  FINAL_RATING  VARCHAR2(50 BYTE),
  COMMENTS      CLOB,
  STATUS        VARCHAR2(30 BYTE)               DEFAULT 'DRAFT',
  CREATED_DATE  TIMESTAMP(6)                    DEFAULT SYSTIMESTAMP
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_PF_LEDGER  (Table) 
--
CREATE TABLE HCM.HR_PF_LEDGER
(
  PF_ID                  NUMBER,
  EMPLOYEE_ID            NUMBER                 NOT NULL,
  ENTRY_DATE             DATE                   NOT NULL,
  EMPLOYEE_CONTRIBUTION  NUMBER(18,2)           DEFAULT 0,
  EMPLOYER_CONTRIBUTION  NUMBER(18,2)           DEFAULT 0,
  BALANCE                NUMBER(18,2)           DEFAULT 0,
  REMARKS                VARCHAR2(1000 BYTE),
  CREATED_DATE           TIMESTAMP(6)           DEFAULT SYSTIMESTAMP
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- ROLE_PERMISSIONS  (Table) 
--
CREATE TABLE HCM.ROLE_PERMISSIONS
(
  ID             NUMBER,
  ROLE_ID        NUMBER                         NOT NULL,
  PERMISSION_ID  NUMBER                         NOT NULL,
  GRANTED_BY     NUMBER,
  GRANTED_AT     DATE                           DEFAULT SYSDATE
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- SALE_INVOICE_ITEMS  (Table) 
--
CREATE TABLE HCM.SALE_INVOICE_ITEMS
(
  ITEM_LINE_ID  NUMBER,
  INVOICE_ID    NUMBER                          NOT NULL,
  ITEM_ID       NUMBER                          NOT NULL,
  QTY           NUMBER                          DEFAULT 1,
  PRICE         NUMBER(10,2)                    NOT NULL,
  LINE_TOTAL    NUMBER(12,2)                    NOT NULL
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- IDX_ACTIVITY_LOG_USER  (Index) 
--
CREATE INDEX HCM.IDX_ACTIVITY_LOG_USER ON HCM.ACTIVITY_LOG
(USER_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_EMP_DEPT  (Index) 
--
CREATE INDEX HCM.IDX_EMP_DEPT ON HCM.HR_EMPLOYEES
(DEPARTMENT_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_EMP_POS  (Index) 
--
CREATE INDEX HCM.IDX_EMP_POS ON HCM.HR_EMPLOYEES
(POSITION_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_LEAVE_EMP  (Index) 
--
CREATE INDEX HCM.IDX_LEAVE_EMP ON HCM.HR_LEAVE_REQUEST
(EMPLOYEE_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_ROLE_PERMISSIONS_PERM  (Index) 
--
CREATE INDEX HCM.IDX_ROLE_PERMISSIONS_PERM ON HCM.ROLE_PERMISSIONS
(PERMISSION_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- IDX_ROLE_PERMISSIONS_ROLE  (Index) 
--
CREATE INDEX HCM.IDX_ROLE_PERMISSIONS_ROLE ON HCM.ROLE_PERMISSIONS
(ROLE_ID)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- VW_USER_ROLE_PERMISSIONS  (View) 
--
CREATE OR REPLACE FORCE VIEW HCM.VW_USER_ROLE_PERMISSIONS
(USER_ID, USERNAME, ROLE_ID, ROLE_NAME, PERMISSION_ID, 
 PERMISSION_CODE, PERMISSION_NAME, MODULE_ID)
AS 
SELECT 
    u.id AS user_id,
    u.username,
    r.id AS role_id,
    r.role_name,
    p.id AS permission_id,
    p.permission_code,
    p.permission_name,
    p.module_id
FROM users u
JOIN user_roles ur 
    ON u.id = ur.user_id
JOIN roles r 
    ON ur.role_id = r.id
JOIN role_permissions rp 
    ON r.id = rp.role_id
JOIN permissions p 
    ON rp.permission_id = p.id;


--
-- V_EMPLOYEE_BASIC  (View) 
--
CREATE OR REPLACE FORCE VIEW HCM.V_EMPLOYEE_BASIC
(EMPLOYEE_ID, EMPLOYEE_NUMBER, FIRST_NAME, LAST_NAME, FULL_NAME, 
 EMAIL, PHONE, STATUS, DEPARTMENT, POSITION, 
 JOIN_DATE)
AS 
SELECT e.employee_id, e.employee_number, e.first_name, e.last_name, e.full_name, e.email, e.phone, e.status, d.name AS department, p.title AS position, e.join_date
FROM hr_employees e
LEFT JOIN hr_department d ON e.department_id = d.department_id
LEFT JOIN hr_position p ON e.position_id = p.position_id;


--
-- V_PAYROLL_REGISTER  (View) 
--
CREATE OR REPLACE FORCE VIEW HCM.V_PAYROLL_REGISTER
(PAYSLIP_ID, PAYROLL_ID, RUN_MONTH, EMPLOYEE_ID, EMPLOYEE_NUMBER, 
 FULL_NAME, GROSS, DEDUCTIONS, TAX, NET)
AS 
SELECT ps.payslip_id, pr.payroll_id, pr.run_month, ps.employee_id, e.employee_number, e.full_name, ps.gross, ps.deductions, ps.tax, ps.net
FROM hr_payslip ps
JOIN hr_payroll_run pr ON ps.payroll_id = pr.payroll_id
JOIN hr_employees e ON ps.employee_id = e.employee_id;


--
-- TRG_ACTIVITY_LOG_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_activity_log_id
BEFORE INSERT ON HCM.ACTIVITY_LOG
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT activity_log_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- TRG_AUDIT_HR_EMPLOYEES  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_audit_hr_employees
AFTER INSERT OR UPDATE OR DELETE ON HCM.HR_EMPLOYEES
FOR EACH ROW
DECLARE
  v_old CLOB;
  v_new CLOB;
  v_key VARCHAR2(200);
BEGIN
  IF INSERTING THEN
    v_new := 'FIRST_NAME=' || :NEW.first_name || ';LAST_NAME=' || :NEW.last_name || ';STATUS=' || :NEW.status;
    v_key := 'EMPLOYEE_ID=' || :NEW.employee_id;
    hrms_audit_record('hr_employees','INSERT',v_key,null,v_new);
  ELSIF UPDATING THEN
    v_old := 'FIRST_NAME=' || :OLD.first_name || ';LAST_NAME=' || :OLD.last_name || ';STATUS=' || :OLD.status;
    v_new := 'FIRST_NAME=' || :NEW.first_name || ';LAST_NAME=' || :NEW.last_name || ';STATUS=' || :NEW.status;
    v_key := 'EMPLOYEE_ID=' || NVL(:NEW.employee_id,:OLD.employee_id);
    hrms_audit_record('hr_employees','UPDATE',v_key,v_old,v_new);
  ELSIF DELETING THEN
    v_old := 'FIRST_NAME=' || :OLD.first_name || ';LAST_NAME=' || :OLD.last_name || ';STATUS=' || :OLD.status;
    v_key := 'EMPLOYEE_ID=' || :OLD.employee_id;
    hrms_audit_record('hr_employees','DELETE',v_key,v_old,null);
  END IF;
END;
/


--
-- TRG_AUDIT_HR_LOAN  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_audit_hr_loan
AFTER INSERT OR UPDATE OR DELETE ON HCM.HR_LOAN
FOR EACH ROW
DECLARE
  v_old CLOB;
  v_new CLOB;
  v_key VARCHAR2(200);
BEGIN
  IF INSERTING THEN
    v_new := 'EMP='||:NEW.employee_id||';PRIN='||NVL(TO_CHAR(:NEW.principal_amount),'0')||';OUT='||NVL(TO_CHAR(:NEW.outstanding_amount),'0');
    v_key := 'LN='||:NEW.loan_id;
    hrms_audit_record('HR_LOAN','INSERT',v_key,null,v_new);
  ELSIF UPDATING THEN
    v_old := 'PRIN='||NVL(TO_CHAR(:OLD.principal_amount),'0')||';OUT='||NVL(TO_CHAR(:OLD.outstanding_amount),'0');
    v_new := 'PRIN='||NVL(TO_CHAR(:NEW.principal_amount),'0')||';OUT='||NVL(TO_CHAR(:NEW.outstanding_amount),'0');
    v_key := 'LN='||NVL(:NEW.loan_id,:OLD.loan_id);
    hrms_audit_record('HR_LOAN','UPDATE',v_key,v_old,v_new);
  ELSIF DELETING THEN
    v_old := 'PRIN='||NVL(TO_CHAR(:OLD.principal_amount),'0')||';OUT='||NVL(TO_CHAR(:OLD.outstanding_amount),'0');
    v_key := 'LN='||:OLD.loan_id;
    hrms_audit_record('HR_LOAN','DELETE',v_key,v_old,null);
  END IF;
END;
/


--
-- TRG_AUDIT_HR_PAYSLIP  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_audit_hr_payslip
AFTER INSERT OR UPDATE OR DELETE ON HCM.HR_PAYSLIP
FOR EACH ROW
DECLARE
  v_old CLOB;
  v_new CLOB;
  v_key VARCHAR2(200);
BEGIN
  IF INSERTING THEN
    v_new := 'EMP='||:NEW.employee_id||';GROSS='||NVL(TO_CHAR(:NEW.gross),'0')||';NET='||NVL(TO_CHAR(:NEW.net),'0');
    v_key := 'PS='||:NEW.payslip_id;
    hrms_audit_record('HR_PAYSLIP','INSERT',v_key,null,v_new);
  ELSIF UPDATING THEN
    v_old := 'GROSS='||NVL(TO_CHAR(:OLD.gross),'0')||';NET='||NVL(TO_CHAR(:OLD.net),'0');
    v_new := 'GROSS='||NVL(TO_CHAR(:NEW.gross),'0')||';NET='||NVL(TO_CHAR(:NEW.net),'0');
    v_key := 'PS='||NVL(:NEW.payslip_id,:OLD.payslip_id);
    hrms_audit_record('HR_PAYSLIP','UPDATE',v_key,v_old,v_new);
  ELSIF DELETING THEN
    v_old := 'GROSS='||NVL(TO_CHAR(:OLD.gross),'0')||';NET='||NVL(TO_CHAR(:OLD.net),'0');
    v_key := 'PS='||:OLD.payslip_id;
    hrms_audit_record('HR_PAYSLIP','DELETE',v_key,v_old,null);
  END IF;
END;
/


--
-- TRG_EMP_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_emp_bi
BEFORE INSERT ON HCM.HR_EMPLOYEES
FOR EACH ROW
BEGIN
IF :NEW.employee_id IS NULL THEN
SELECT hr_employee_seq.NEXTVAL INTO :NEW.employee_id FROM DUAL;
END IF;
:NEW.created_date := SYSTIMESTAMP;
:NEW.updated_date := SYSTIMESTAMP;
END;
/


--
-- TRG_EMP_BU  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_emp_bu
BEFORE UPDATE ON HCM.HR_EMPLOYEES
FOR EACH ROW
BEGIN
  :NEW.updated_date := SYSTIMESTAMP;
END;
/


--
-- TRG_LEAVE_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_leave_bi
BEFORE INSERT ON HCM.HR_LEAVE_REQUEST
FOR EACH ROW
BEGIN
  IF :NEW.leave_id IS NULL THEN
    SELECT hr_leave_seq.NEXTVAL INTO :NEW.leave_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
  :NEW.updated_date := SYSTIMESTAMP;
END;
/


--
-- TRG_LOAN_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_loan_bi
BEFORE INSERT ON HCM.HR_LOAN
FOR EACH ROW
BEGIN
  IF :NEW.loan_id IS NULL THEN
    SELECT hr_loan_seq.NEXTVAL INTO :NEW.loan_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
END;
/


--
-- TRG_PAYSLIP_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_payslip_bi
BEFORE INSERT ON HCM.HR_PAYSLIP
FOR EACH ROW
BEGIN
  IF :NEW.payslip_id IS NULL THEN
    SELECT hr_payslip_seq.NEXTVAL INTO :NEW.payslip_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
END;
/


--
-- TRG_PERF_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_perf_bi
BEFORE INSERT ON HCM.HR_PERFORMANCE_REVIEW
FOR EACH ROW
BEGIN
  IF :NEW.review_id IS NULL THEN
    SELECT hr_perf_seq.NEXTVAL INTO :NEW.review_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
END;
/


--
-- TRG_PF_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_pf_bi
BEFORE INSERT ON HCM.HR_PF_LEDGER
FOR EACH ROW
BEGIN
  IF :NEW.pf_id IS NULL THEN
    SELECT hr_pf_seq.NEXTVAL INTO :NEW.pf_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
END;
/


--
-- TRG_ROLE_PERMISSIONS_ID  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_role_permissions_id
BEFORE INSERT ON HCM.ROLE_PERMISSIONS
FOR EACH ROW
WHEN (
NEW.id IS NULL
      )
BEGIN
    SELECT role_permissions_seq.NEXTVAL INTO :NEW.id FROM dual;
END;
/


--
-- HR_ATTENDANCE  (Table) 
--
CREATE TABLE HCM.HR_ATTENDANCE
(
  ATTENDANCE_ID    NUMBER,
  EMPLOYEE_ID      NUMBER                       NOT NULL,
  ATTENDANCE_DATE  DATE                         NOT NULL,
  IN_TIME          TIMESTAMP(6) WITH TIME ZONE,
  OUT_TIME         TIMESTAMP(6) WITH TIME ZONE,
  SHIFT_ID         NUMBER,
  DEVICE_ID        VARCHAR2(100 BYTE),
  PUNCH_TYPE       VARCHAR2(20 BYTE),
  STATUS           VARCHAR2(50 BYTE),
  PAYROLL_FLAG     VARCHAR2(10 BYTE)            DEFAULT 'Y',
  CREATED_BY       VARCHAR2(100 BYTE),
  CREATED_DATE     TIMESTAMP(6)                 DEFAULT SYSTIMESTAMP,
  UPDATED_BY       VARCHAR2(100 BYTE),
  UPDATED_DATE     TIMESTAMP(6)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- HR_CONTRACT  (Table) 
--
CREATE TABLE HCM.HR_CONTRACT
(
  CONTRACT_ID              NUMBER,
  EMPLOYEE_ID              NUMBER               NOT NULL,
  CONTRACT_TYPE            VARCHAR2(50 BYTE),
  START_DATE               DATE,
  END_DATE                 DATE,
  SALARY_CURRENCY          VARCHAR2(10 BYTE)    DEFAULT 'BDT',
  SALARY_AMOUNT            NUMBER(18,2),
  PROBATION_PERIOD_MONTHS  NUMBER,
  NOTICE_PERIOD_DAYS       NUMBER,
  CREATED_BY               VARCHAR2(100 BYTE),
  CREATED_DATE             TIMESTAMP(6)         DEFAULT SYSTIMESTAMP,
  UPDATED_BY               VARCHAR2(100 BYTE),
  UPDATED_DATE             TIMESTAMP(6)
)
TABLESPACE HCM_TS
RESULT_CACHE (MODE DEFAULT)
PCTUSED    0
PCTFREE    10
INITRANS   1
MAXTRANS   255
STORAGE    (
            MAXSIZE          UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           )
NOCOMPRESS ;


--
-- IDX_ATT_EMP_DATE  (Index) 
--
CREATE INDEX HCM.IDX_ATT_EMP_DATE ON HCM.HR_ATTENDANCE
(EMPLOYEE_ID, ATTENDANCE_DATE)
TABLESPACE HCM_TS
PCTFREE    10
INITRANS   2
MAXTRANS   255
STORAGE    (
            INITIAL          64K
            NEXT             1M
            MAXSIZE          UNLIMITED
            MINEXTENTS       1
            MAXEXTENTS       UNLIMITED
            PCTINCREASE      0
            BUFFER_POOL      DEFAULT
            FLASH_CACHE      DEFAULT
            CELL_FLASH_CACHE DEFAULT
           );


--
-- VW_USER_EFFECTIVE_PERMISSIONS  (View) 
--
CREATE OR REPLACE FORCE VIEW HCM.VW_USER_EFFECTIVE_PERMISSIONS
(USER_ID, USERNAME, ROLE_ID, ROLE_NAME, PERMISSION_ID, 
 PERMISSION_CODE, PERMISSION_NAME, MODULE_ID)
AS 
SELECT 
    user_id,
    username,
    role_id,
    role_name,
    permission_id,
    permission_code,
    permission_name,
    module_id
FROM vw_user_role_permissions

UNION

SELECT 
    user_id,
    username,
    role_id,
    role_name,
    permission_id,
    permission_code,
    permission_name,
    module_id
FROM vw_user_direct_permissions;


--
-- V_ATTENDANCE_SUMMARY  (View) 
--
CREATE OR REPLACE FORCE VIEW HCM.V_ATTENDANCE_SUMMARY
(EMPLOYEE_ID, ATTENDANCE_DATE, FIRST_IN, LAST_OUT)
AS 
SELECT employee_id, attendance_date, MIN(in_time) AS first_in, MAX(out_time) AS last_out
FROM hr_attendance
GROUP BY employee_id, attendance_date;


--
-- TRG_ATTENDANCE_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_attendance_bi
BEFORE INSERT ON HCM.HR_ATTENDANCE
FOR EACH ROW
BEGIN
  IF :NEW.attendance_id IS NULL THEN
    SELECT hr_attendance_seq.NEXTVAL INTO :NEW.attendance_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
  :NEW.updated_date := SYSTIMESTAMP;
END;
/


--
-- TRG_ATTENDANCE_BU  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_attendance_bu
BEFORE UPDATE ON HCM.HR_ATTENDANCE
FOR EACH ROW
BEGIN
  :NEW.updated_date := SYSTIMESTAMP;
END;
/


--
-- TRG_AUDIT_HR_ATTENDANCE  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_audit_hr_attendance
AFTER INSERT OR UPDATE OR DELETE ON HCM.HR_ATTENDANCE
FOR EACH ROW
DECLARE
  v_old CLOB;
  v_new CLOB;
  v_key VARCHAR2(200);
BEGIN
  IF INSERTING THEN
    v_new := 'EMP='||:NEW.employee_id||';DATE='||TO_CHAR(:NEW.attendance_date,'YYYY-MM-DD')||';IN='||TO_CHAR(:NEW.in_time,'YYYY-MM-DD HH24:MI:SS');
    v_key := 'ATT='||:NEW.attendance_id;
    hrms_audit_record('HR_ATTENDANCE','INSERT',v_key,null,v_new);
  ELSIF UPDATING THEN
    v_old := 'IN='||TO_CHAR(:OLD.in_time,'YYYY-MM-DD HH24:MI:SS')||';OUT='||TO_CHAR(:OLD.out_time,'YYYY-MM-DD HH24:MI:SS');
    v_new := 'IN='||TO_CHAR(:NEW.in_time,'YYYY-MM-DD HH24:MI:SS')||';OUT='||TO_CHAR(:NEW.out_time,'YYYY-MM-DD HH24:MI:SS');
    v_key := 'ATT='||NVL(:NEW.attendance_id,:OLD.attendance_id);
    hrms_audit_record('HR_ATTENDANCE','UPDATE',v_key,v_old,v_new);
  ELSIF DELETING THEN
    v_old := 'IN='||TO_CHAR(:OLD.in_time,'YYYY-MM-DD HH24:MI:SS')||';OUT='||TO_CHAR(:OLD.out_time,'YYYY-MM-DD HH24:MI:SS');
    v_key := 'ATT='||:OLD.attendance_id;
    hrms_audit_record('HR_ATTENDANCE','DELETE',v_key,v_old,null);
  END IF;
END;
/


--
-- TRG_CONTRACT_BI  (Trigger) 
--
CREATE OR REPLACE TRIGGER HCM.trg_contract_bi
BEFORE INSERT ON HCM.HR_CONTRACT
FOR EACH ROW
BEGIN
  IF :NEW.contract_id IS NULL THEN
    SELECT hr_contract_seq.NEXTVAL INTO :NEW.contract_id FROM DUAL;
  END IF;
  :NEW.created_date := SYSTIMESTAMP;
  :NEW.updated_date := SYSTIMESTAMP;
END;
/


-- 
-- Non Foreign Key Constraints for Table COUNTRY_LIST 
-- 
ALTER TABLE HCM.COUNTRY_LIST ADD (
  CONSTRAINT COUNTRY_LIST_PK
  PRIMARY KEY
  (COUNTRY_ID)
  USING INDEX HCM.COUNTRY_LIST_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_AUDIT_LOG 
-- 
ALTER TABLE HCM.HR_AUDIT_LOG ADD (
  PRIMARY KEY
  (AUDIT_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_DEPARTMENT 
-- 
ALTER TABLE HCM.HR_DEPARTMENT ADD (
  PRIMARY KEY
  (DEPARTMENT_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_EMPLOYEE 
-- 
ALTER TABLE HCM.HR_EMPLOYEE ADD (
  CONSTRAINT HR_EMPLOYEE_PK
  PRIMARY KEY
  (PERSON_ID)
  USING INDEX HCM.HR_EMPLOYEE_PK
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_EMPLOYEE ADD (
  CONSTRAINT HR_EMPLOYEE_U01
  UNIQUE (EMP_NO)
  USING INDEX HCM.HR_EMPLOYEE_U01
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_EMP_ASSIGNMENT 
-- 
ALTER TABLE HCM.HR_EMP_ASSIGNMENT ADD (
  CONSTRAINT HR_EMP_ASSIGNMENT_PK
  PRIMARY KEY
  (ASSIGNMENT_ID)
  USING INDEX HCM.HR_EMP_ASSIGNMENT_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_GRADE 
-- 
ALTER TABLE HCM.HR_GRADE ADD (
  CONSTRAINT GRADE_LIST_PK
  PRIMARY KEY
  (ID)
  USING INDEX HCM.GRADE_LIST_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_LEAVE_TYPE 
-- 
ALTER TABLE HCM.HR_LEAVE_TYPE ADD (
  PRIMARY KEY
  (LEAVE_TYPE_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_LEAVE_TYPE ADD (
  UNIQUE (CODE)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_ORG 
-- 
ALTER TABLE HCM.HR_ORG ADD (
  CONSTRAINT HR_ORG_PK
  PRIMARY KEY
  (ID)
  USING INDEX HCM.HR_ORG_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_ORG_TYPE 
-- 
ALTER TABLE HCM.HR_ORG_TYPE ADD (
  CONSTRAINT HR_ORG_TYPE_PK
  PRIMARY KEY
  (ID)
  USING INDEX HCM.HR_ORG_TYPE_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_PAYROLL_RUN 
-- 
ALTER TABLE HCM.HR_PAYROLL_RUN ADD (
  PRIMARY KEY
  (PAYROLL_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_PAY_COMPONENT 
-- 
ALTER TABLE HCM.HR_PAY_COMPONENT ADD (
  PRIMARY KEY
  (COMPONENT_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_PAY_COMPONENT ADD (
  UNIQUE (CODE)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_PAY_STRUCTURE 
-- 
ALTER TABLE HCM.HR_PAY_STRUCTURE ADD (
  PRIMARY KEY
  (PAY_STRUCTURE_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_PAY_STRUCTURE_COMPONENT 
-- 
ALTER TABLE HCM.HR_PAY_STRUCTURE_COMPONENT ADD (
  PRIMARY KEY
  (PAY_STRUCTURE_ID, COMPONENT_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_PERSON_TYPE 
-- 
ALTER TABLE HCM.HR_PERSON_TYPE ADD (
  CONSTRAINT HR_PERSON_TYPE_PK
  PRIMARY KEY
  (PERSON_TYPE_ID)
  USING INDEX HCM.HR_PERSON_TYPE_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_POSITION 
-- 
ALTER TABLE HCM.HR_POSITION ADD (
  PRIMARY KEY
  (POSITION_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_SHIFT 
-- 
ALTER TABLE HCM.HR_SHIFT ADD (
  PRIMARY KEY
  (SHIFT_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_SHIFT ADD (
  UNIQUE (CODE)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table MODULES 
-- 
ALTER TABLE HCM.MODULES ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table PERMISSIONS 
-- 
ALTER TABLE HCM.PERMISSIONS ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table ROLES 
-- 
ALTER TABLE HCM.ROLES ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table ROLE_MODULE_VISIBILITY 
-- 
ALTER TABLE HCM.ROLE_MODULE_VISIBILITY ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table SALE_CUSTOMERS 
-- 
ALTER TABLE HCM.SALE_CUSTOMERS ADD (
  PRIMARY KEY
  (CUSTOMER_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table SALE_INVOICE 
-- 
ALTER TABLE HCM.SALE_INVOICE ADD (
  PRIMARY KEY
  (INVOICE_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);

ALTER TABLE HCM.SALE_INVOICE ADD (
  UNIQUE (INVOICE_NO)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table SALE_ITEMS 
-- 
ALTER TABLE HCM.SALE_ITEMS ADD (
  PRIMARY KEY
  (ITEM_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table SALE_USERS 
-- 
ALTER TABLE HCM.SALE_USERS ADD (
  PRIMARY KEY
  (USER_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);

ALTER TABLE HCM.SALE_USERS ADD (
  UNIQUE (USERNAME)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table UPAZILLA_LIST 
-- 
ALTER TABLE HCM.UPAZILLA_LIST ADD (
  CONSTRAINT UPAZILLA_LIST_PK
  PRIMARY KEY
  (UPAZILLA_ID)
  USING INDEX HCM.UPAZILLA_LIST_PK
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table USERS 
-- 
ALTER TABLE HCM.USERS ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);

ALTER TABLE HCM.USERS ADD (
  UNIQUE (USERNAME)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table USER_PERMISSIONS 
-- 
ALTER TABLE HCM.USER_PERMISSIONS ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table USER_ROLES 
-- 
ALTER TABLE HCM.USER_ROLES ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table ACTIVITY_LOG 
-- 
ALTER TABLE HCM.ACTIVITY_LOG ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_EMPLOYEES 
-- 
ALTER TABLE HCM.HR_EMPLOYEES ADD (
  PRIMARY KEY
  (EMPLOYEE_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_EMPLOYEES ADD (
  UNIQUE (EMPLOYEE_NUMBER)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_LEAVE_BALANCE 
-- 
ALTER TABLE HCM.HR_LEAVE_BALANCE ADD (
  PRIMARY KEY
  (EMPLOYEE_ID, LEAVE_TYPE_ID, YEAR)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_LEAVE_REQUEST 
-- 
ALTER TABLE HCM.HR_LEAVE_REQUEST ADD (
  PRIMARY KEY
  (LEAVE_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_LOAN 
-- 
ALTER TABLE HCM.HR_LOAN ADD (
  PRIMARY KEY
  (LOAN_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_PAYSLIP 
-- 
ALTER TABLE HCM.HR_PAYSLIP ADD (
  PRIMARY KEY
  (PAYSLIP_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_PERFORMANCE_REVIEW 
-- 
ALTER TABLE HCM.HR_PERFORMANCE_REVIEW ADD (
  PRIMARY KEY
  (REVIEW_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_PF_LEDGER 
-- 
ALTER TABLE HCM.HR_PF_LEDGER ADD (
  PRIMARY KEY
  (PF_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table ROLE_PERMISSIONS 
-- 
ALTER TABLE HCM.ROLE_PERMISSIONS ADD (
  PRIMARY KEY
  (ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table SALE_INVOICE_ITEMS 
-- 
ALTER TABLE HCM.SALE_INVOICE_ITEMS ADD (
  PRIMARY KEY
  (ITEM_LINE_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_ATTENDANCE 
-- 
ALTER TABLE HCM.HR_ATTENDANCE ADD (
  PRIMARY KEY
  (ATTENDANCE_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                INITIAL          64K
                NEXT             1M
                MAXSIZE          UNLIMITED
                MINEXTENTS       1
                MAXEXTENTS       UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Non Foreign Key Constraints for Table HR_CONTRACT 
-- 
ALTER TABLE HCM.HR_CONTRACT ADD (
  PRIMARY KEY
  (CONTRACT_ID)
  USING INDEX
    TABLESPACE HCM_TS
    PCTFREE    10
    INITRANS   2
    MAXTRANS   255
    STORAGE    (
                MAXSIZE          UNLIMITED
                PCTINCREASE      0
                BUFFER_POOL      DEFAULT
                FLASH_CACHE      DEFAULT
                CELL_FLASH_CACHE DEFAULT
               )
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table HR_PAY_STRUCTURE_COMPONENT 
-- 
ALTER TABLE HCM.HR_PAY_STRUCTURE_COMPONENT ADD (
  CONSTRAINT FK_PSC_COMPONENT 
  FOREIGN KEY (COMPONENT_ID) 
  REFERENCES HCM.HR_PAY_COMPONENT (COMPONENT_ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_PAY_STRUCTURE_COMPONENT ADD (
  CONSTRAINT FK_PSC_STRUCTURE 
  FOREIGN KEY (PAY_STRUCTURE_ID) 
  REFERENCES HCM.HR_PAY_STRUCTURE (PAY_STRUCTURE_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table PERMISSIONS 
-- 
ALTER TABLE HCM.PERMISSIONS ADD (
  CONSTRAINT FK_PERMISSIONS_MODULE 
  FOREIGN KEY (MODULE_ID) 
  REFERENCES HCM.MODULES (ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table ROLE_MODULE_VISIBILITY 
-- 
ALTER TABLE HCM.ROLE_MODULE_VISIBILITY ADD (
  CONSTRAINT FK_RM_VISIBILITY_MODULE 
  FOREIGN KEY (MODULE_ID) 
  REFERENCES HCM.MODULES (ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.ROLE_MODULE_VISIBILITY ADD (
  CONSTRAINT FK_RM_VISIBILITY_ROLE 
  FOREIGN KEY (ROLE_ID) 
  REFERENCES HCM.ROLES (ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table SALE_INVOICE 
-- 
ALTER TABLE HCM.SALE_INVOICE ADD (
  FOREIGN KEY (CUSTOMER_ID) 
  REFERENCES HCM.SALE_CUSTOMERS (CUSTOMER_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table USER_PERMISSIONS 
-- 
ALTER TABLE HCM.USER_PERMISSIONS ADD (
  CONSTRAINT FK_USER_PERMISSIONS_PERM 
  FOREIGN KEY (PERMISSION_ID) 
  REFERENCES HCM.PERMISSIONS (ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.USER_PERMISSIONS ADD (
  CONSTRAINT FK_USER_PERMISSIONS_USER 
  FOREIGN KEY (USER_ID) 
  REFERENCES HCM.USERS (ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table USER_ROLES 
-- 
ALTER TABLE HCM.USER_ROLES ADD (
  CONSTRAINT FK_USER_ROLES_ROLE 
  FOREIGN KEY (ROLE_ID) 
  REFERENCES HCM.ROLES (ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.USER_ROLES ADD (
  CONSTRAINT FK_USER_ROLES_USER 
  FOREIGN KEY (USER_ID) 
  REFERENCES HCM.USERS (ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table ACTIVITY_LOG 
-- 
ALTER TABLE HCM.ACTIVITY_LOG ADD (
  CONSTRAINT FK_ACTIVITY_LOG_USER 
  FOREIGN KEY (USER_ID) 
  REFERENCES HCM.USERS (ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table HR_EMPLOYEES 
-- 
ALTER TABLE HCM.HR_EMPLOYEES ADD (
  CONSTRAINT FK_EMP_DEPT 
  FOREIGN KEY (DEPARTMENT_ID) 
  REFERENCES HCM.HR_DEPARTMENT (DEPARTMENT_ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_EMPLOYEES ADD (
  CONSTRAINT FK_EMP_MGR 
  FOREIGN KEY (MANAGER_ID) 
  REFERENCES HCM.HR_EMPLOYEES (EMPLOYEE_ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_EMPLOYEES ADD (
  CONSTRAINT FK_EMP_POS 
  FOREIGN KEY (POSITION_ID) 
  REFERENCES HCM.HR_POSITION (POSITION_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table HR_LEAVE_BALANCE 
-- 
ALTER TABLE HCM.HR_LEAVE_BALANCE ADD (
  CONSTRAINT FK_LB_EMP 
  FOREIGN KEY (EMPLOYEE_ID) 
  REFERENCES HCM.HR_EMPLOYEES (EMPLOYEE_ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_LEAVE_BALANCE ADD (
  CONSTRAINT FK_LB_LT 
  FOREIGN KEY (LEAVE_TYPE_ID) 
  REFERENCES HCM.HR_LEAVE_TYPE (LEAVE_TYPE_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table HR_LEAVE_REQUEST 
-- 
ALTER TABLE HCM.HR_LEAVE_REQUEST ADD (
  CONSTRAINT FK_LR_EMP 
  FOREIGN KEY (EMPLOYEE_ID) 
  REFERENCES HCM.HR_EMPLOYEES (EMPLOYEE_ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_LEAVE_REQUEST ADD (
  CONSTRAINT FK_LR_LT 
  FOREIGN KEY (LEAVE_TYPE_ID) 
  REFERENCES HCM.HR_LEAVE_TYPE (LEAVE_TYPE_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table HR_LOAN 
-- 
ALTER TABLE HCM.HR_LOAN ADD (
  CONSTRAINT FK_LOAN_EMP 
  FOREIGN KEY (EMPLOYEE_ID) 
  REFERENCES HCM.HR_EMPLOYEES (EMPLOYEE_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table HR_PAYSLIP 
-- 
ALTER TABLE HCM.HR_PAYSLIP ADD (
  CONSTRAINT FK_PS_EMP 
  FOREIGN KEY (EMPLOYEE_ID) 
  REFERENCES HCM.HR_EMPLOYEES (EMPLOYEE_ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.HR_PAYSLIP ADD (
  CONSTRAINT FK_PS_RUN 
  FOREIGN KEY (PAYROLL_ID) 
  REFERENCES HCM.HR_PAYROLL_RUN (PAYROLL_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table HR_PERFORMANCE_REVIEW 
-- 
ALTER TABLE HCM.HR_PERFORMANCE_REVIEW ADD (
  CONSTRAINT FK_PR_EMP 
  FOREIGN KEY (EMPLOYEE_ID) 
  REFERENCES HCM.HR_EMPLOYEES (EMPLOYEE_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table HR_PF_LEDGER 
-- 
ALTER TABLE HCM.HR_PF_LEDGER ADD (
  CONSTRAINT FK_PF_EMP 
  FOREIGN KEY (EMPLOYEE_ID) 
  REFERENCES HCM.HR_EMPLOYEES (EMPLOYEE_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table ROLE_PERMISSIONS 
-- 
ALTER TABLE HCM.ROLE_PERMISSIONS ADD (
  CONSTRAINT FK_ROLE_PERMISSIONS_ADMIN 
  FOREIGN KEY (GRANTED_BY) 
  REFERENCES HCM.USERS (ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.ROLE_PERMISSIONS ADD (
  CONSTRAINT FK_ROLE_PERMISSIONS_PERMISSION 
  FOREIGN KEY (PERMISSION_ID) 
  REFERENCES HCM.PERMISSIONS (ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.ROLE_PERMISSIONS ADD (
  CONSTRAINT FK_ROLE_PERMISSIONS_ROLE 
  FOREIGN KEY (ROLE_ID) 
  REFERENCES HCM.ROLES (ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table SALE_INVOICE_ITEMS 
-- 
ALTER TABLE HCM.SALE_INVOICE_ITEMS ADD (
  FOREIGN KEY (INVOICE_ID) 
  REFERENCES HCM.SALE_INVOICE (INVOICE_ID)
  ENABLE VALIDATE);

ALTER TABLE HCM.SALE_INVOICE_ITEMS ADD (
  FOREIGN KEY (ITEM_ID) 
  REFERENCES HCM.SALE_ITEMS (ITEM_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table HR_ATTENDANCE 
-- 
ALTER TABLE HCM.HR_ATTENDANCE ADD (
  CONSTRAINT FK_ATT_EMP 
  FOREIGN KEY (EMPLOYEE_ID) 
  REFERENCES HCM.HR_EMPLOYEES (EMPLOYEE_ID)
  ENABLE VALIDATE);


-- 
-- Foreign Key Constraints for Table HR_CONTRACT 
-- 
ALTER TABLE HCM.HR_CONTRACT ADD (
  CONSTRAINT FK_CONTRACT_EMPLOYEE 
  FOREIGN KEY (EMPLOYEE_ID) 
  REFERENCES HCM.HR_EMPLOYEES (EMPLOYEE_ID)
  ENABLE VALIDATE);


GRANT READ, WRITE ON DIRECTORY DATA_PUMP_DIR TO EXP_FULL_DATABASE;

GRANT EXECUTE, READ, WRITE ON DIRECTORY DMPDIR1 TO HSTU;

GRANT EXECUTE, READ, WRITE ON DIRECTORY MYDIR TO HSTU;

GRANT READ, WRITE ON DIRECTORY DATA_PUMP_DIR TO IMP_FULL_DATABASE;

GRANT READ, WRITE ON DIRECTORY ORACLE_OCM_CONFIG_DIR TO ORACLE_OCM;

GRANT EXECUTE, READ, WRITE ON DIRECTORY DB TO SM WITH GRANT OPTION;

GRANT READ, WRITE ON DIRECTORY DMPDIR1 TO SM;

GRANT EXECUTE, READ, WRITE ON DIRECTORY MYDIR TO SM;

GRANT EXECUTE, READ, WRITE ON DIRECTORY TEST_DIR TO SOUTHPOINT WITH GRANT OPTION;

GRANT READ, WRITE ON DIRECTORY DMPDIR1 TO SYSTEM;