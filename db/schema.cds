namespace Fiorielements;
using {sap.changelog as sapChangelog} from '@cap-js/change-tracking';

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

entity messages 
{
  key ID : UUID;
  question : String;
  answer   : String;
  createdAt : Timestamp = $now;
}

action createActivity(
  date       : String,
  companyId  : String,
  hours      : Decimal(5,2),
  description: String
) returns String;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// App ChangeLog
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
@readonly
entity ChangeLog              as projection on sapChangelog.ChangeLog;

@Capabilities.SearchRestrictions: {Searchable: true}
entity ChangeLogChanges       as projection on sapChangelog.Changes;

entity ChangeLogEntities      as
  select from ChangeLog distinct {
    key entity
  };

entity ChangeLogUsers         as
  select from ChangeLog distinct {
    key createdBy
  };

entity ChangeLogChangeTypes   as
  select from ChangeLogChanges distinct {
    key modification
  };

entity ChangeLogChangedFields as
  select from ChangeLogChanges distinct {
    key attribute
  };

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