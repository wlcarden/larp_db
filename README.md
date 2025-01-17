# larp_db

## Purpose

A Database for managing Live Action Roleplaying Games

## Data Structure

Data is stored in a MongoDB instance.

Object types consist of:

### USERs

- Contain basic user profile information for a single user; Used for logging in to the database view.

Ex:

```json
{
  "_id": {
    "$oid": "64aa75ce1111111111111111"
  },
  "username": "darkranger",
  "email": "darkranger@fakemail.com",
  "createdAt": {
    "$date": "2024-12-25T10:00:00.000Z"
  },
  "displayName": "Dark Ranger",
  "password": "password_123"
}
```

### GAMEs

- Have one and only one SYSTEM
- Have an array of WRITERs
  - These are objectIds of Users who are writers for a given Game, and thus can view the game's Events, those Event's Modules, and modify Modules they themselves are the author of.
- Have an array of MODULE PROPERTIES
  - These are PROPERTIES that all MODULEs that belong to EVENTs that belong to this GAME should have in addition to the default PROPERTIES all MODULEs have.
  - They may be of various data types.
- Have 0 to many EVENTs

Ex:

```json
{
  "_id": {
    "$oid": "64aa76a83333333333333333"
  },
  "name": "Dark Fables",
  "administrators": [
    {
      "$oid": "64aa75ce1111111111111111"
    }
  ],
  "writers": [
    {
      "$oid": "64aa75ce2222222222222222"
    }
  ],
  "moduleProperties": [
    {
      "key": "monsterDifficulty",
      "label": "Monster Difficulty",
      "type": "number"
    },
    {
      "key": "location",
      "label": "Location",
      "type": "string"
    }
  ],
  "createdAt": {
    "$date": "2024-12-25T11:00:00.000Z"
  }
}
```

### SYSTEM

- This is a db entry for the LARP's mechanical system. We use this to populate system-based features for a GAME.
- Contains basic info about a game system.

Ex:

```json
{
  "_id": {
    "$oid": "64bb91f17777777777777777"
  },
  "name": "Dark Realms",
  "author": "Bob Loblaw",
  "version": "2.0",
  "description": "A homebrew LARP system emphasizing character immersion.",
  "url": "https://www.testlarp.com/",
  "createdAt": {
    "$date": "2025-01-01T10:00:00.000Z"
  }
}
```

### EVENTs

- These are LARP events that have a distinct start and end time.
- Have a link to their parent GAME
- Have a START TIME and END TIME
- Have a long-text DESCRIPTION
- Have 0 to many MODULEs

Ex:

```json
{
  "_id": {
    "$oid": "64aa78f14444444444444444"
  },
  "gameId": {
    "$oid": "64aa76a83333333333333333"
  },
  "name": "Winter Solstice 2024",
  "startTime": "2025-01-17T22:00",
  "endTime": "2025-01-19T12:00",
  "createdAt": {
    "$date": "2024-12-25T12:00:00.000Z"
  },
  "description": "The shortest night of the year comes to Dark Fables."
}
```

### MODULEs

- Modules contain a set of default properties, as well as any MODULE_PROPERTIES defined by their parent game.

Ex:

```json
{
  "_id": {
    "$oid": "64aa794d6666666666666666"
  },
  "eventId": {
    "$oid": "64aa78f14444444444444444"
  },
  "name": "Underworld Banquet",
  "writerId": {
    "$oid": "64aa75ce2222222222222222"
  },
  "duration": 4,
  "startTime": {
    "$date": "2025-01-16T00:00:00.000Z"
  },
  "summary": "A grand feast with hidden perils.",
  "properties": {
    "monsterDifficulty": 5,
    "location": "Shadowy Halls"
  },
  "createdAt": {
    "$date": "2024-12-25T13:45:00.000Z"
  }
}
```
