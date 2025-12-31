namespace Fiorielements;
using {sap.changelog as sapChangelog} from '@cap-js/change-tracking';
using { managed, cuid } from '@sap/cds/common';

// ============================================================================
// Products - Ürün Yönetimi
// ============================================================================
entity Products
{
    key ID : UUID;
    prodName : String(100) @title: 'Product Name';
    prodNumber : String(50) @title: 'Product Number';
    prodManager : String(100) @title: 'Product Manager';
    prodType : String(2) @title: 'Product Type';
    prodStatus : String(20) @title: 'Product Status'; 
    industry : String(50) @title: 'Industry';
    lineOfBusiness : String(50)  @title: 'Line of Business';
    legalOwner : String(100) @title: 'Legal Owner';
}

// ============================================================================
// Companies - Şirket Yönetimi
// ============================================================================
entity Companies : managed, cuid {
    name        : String;
    sector      : String;
    city        : String;
    country     : String;
    activities  : Composition of many Activities on activities.company = $self;
}

// ============================================================================
// Activities - Aktivite/Effor Takibi
// ============================================================================
entity Activities : managed, cuid {
    company     : Association to Companies; 
    hours       : Decimal(4,2);
    description : String(500);
    date        : Date;
}

// ============================================================================
// Plans - Planlama
// ============================================================================
entity Plans : managed, cuid {
    projectName : String(100);
    date        : Date;
    hours       : Decimal(4,2);
    status      : String(20) default 'Planned';
}

// ============================================================================
// Chat Management - Sohbet Yönetimi
// ============================================================================
entity Assistants : cuid {
    key ID              : String(100);  // OpenAI Assistant ID
    name                : String(100);
    description         : String(200);
    systemPrompt        : String(1000); // System prompt
    color               : String(20);   // UI'de renk kodlaması
    icon                : String(50);   // SAP ikon
    isActive            : Boolean default true;
    createdAt           : DateTime default $now;
    modifiedAt          : DateTime default $now;
}

entity Prompts : cuid {
    key ID              : UUID;
    title               : String(100);
    description         : String(200);
    prompt              : String(500);  // Asistana gönderilecek hazır soru
    assistant           : Association to Assistants;  // İlişkili asistan
    assistantID         : String(100);  // OpenAI Assistant ID (denorm)
    icon                : String(50);   // SAP ikon kodu
    sortOrder           : Integer default 0;
    isActive            : Boolean default true;
    createdAt           : DateTime default $now;
    modifiedAt          : DateTime default $now;
}

entity ChatSessions : managed, cuid {
    title               : String(100);
    assistant           : Association to Assistants;  // Hangi asistan kullanıldı
    messages            : Composition of many ChatMessages on messages.session = $self;
}

entity ChatMessages : managed, cuid {
    key session         : Association to ChatSessions;
    role                : String(10) enum {
        user = 'user';
        assistant = 'assistant';
        system = 'system';
    };
    content             : LargeString; 
    timestamp           : DateTime default $now;
}

entity messages 
{
  key ID : UUID;
  question : String;
  answer   : String;
  createdAt : Timestamp = $now;
}

// ============================================================================
// ChangeLog - Değişiklik Takibi (SAP Change Tracking)
// ============================================================================
@readonly
entity ChangeLog as projection on sapChangelog.ChangeLog;

@Capabilities.SearchRestrictions: {Searchable: true}
entity ChangeLogChanges as projection on sapChangelog.Changes;

entity ChangeLogEntities as
  select from ChangeLog distinct {
    key entity
  };

entity ChangeLogUsers as
  select from ChangeLog distinct {
    key createdBy
  };

entity ChangeLogChangeTypes as
  select from ChangeLogChanges distinct {
    key modification
  };

entity ChangeLogChangedFields as
  select from ChangeLogChanges distinct {
    key attribute
  };

// ============================================================================
// Views - Raporlama ve Filtreleme
// ============================================================================
@readonly
entity ProductManagers as select from Products {
    key prodManager
} group by prodManager;

view ProductNumbers as select from Products {
    key prodNumber
} group by prodNumber;

view ProductNames as select from Products {
    key prodName
} group by prodName;

view ProductStatuses as select from Products {
    key prodStatus
} group by prodStatus;

view ProductTypes as select from Products {
    key prodType
} group by prodType;