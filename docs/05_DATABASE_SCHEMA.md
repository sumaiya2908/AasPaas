# docs/05_DATABASE_SCHEMA.md

# Database Schema

Version 1.0

Product: AASPAAS

Database

PostgreSQL + Prisma

Extensions

* pgvector
* uuid-ossp

---

# Design Principles

1. Place-centric architecture
2. Modular entities
3. AI-ready
4. Scalable
5. Audit-friendly
6. Soft delete support

---

# Entity Relationship

```text
User
 │
 ├──────────────┐
 │              │
Experience   Journey
 │
 │
Place
 │
 ├──────────────┐
 │              │
City      LocalUpdate
 │              │
 ├──────────────┤
 │              │
Collection   AI Summary
 │
 Tags

Experience
 │
 ├──────────────┐
 │              │
Comment      Vote
```

---

# CITY

Stores destination-level information.

Fields

id

name

state

country

slug

description

heroImage

latitude

longitude

timezone

currency

language

createdAt

updatedAt

Indexes

slug

country

name

---

# PLACE

Core entity.

Everything revolves around a Place.

Fields

id

cityId

name

slug

description

category

address

latitude

longitude

heroImage

coverImages[]

website

phone

openingHours

priceLevel

verified

livingScore

communityScore

aiSummaryId

createdAt

updatedAt

Indexes

cityId

category

location

livingScore

communityScore

slug

---

# EXPERIENCE

Formerly called Post.

Long-term community knowledge.

Fields

id

userId

placeId

title

description

experienceType

visibility

status

helpfulCount

commentCount

bookmarkCount

imageUrls[]

embeddingId

createdAt

updatedAt

deletedAt

Experience Types

Question

Recommendation

Food Tip

Photo Story

Hidden Gem

Warning

Indexes

placeId

userId

experienceType

createdAt

---

# LOCAL UPDATE

24-hour live content.

Fields

id

userId

placeId

updateType

description

imageUrl

expiresAt

confirmCount

rejectCount

status

createdAt

Update Types

Weather

Traffic

Festival

Food

Crowd

Safety

Transport

Event

Indexes

placeId

expiresAt

createdAt

---

# COMMENT

Nested discussion.

Fields

id

experienceId

parentCommentId

userId

content

helpfulCount

createdAt

updatedAt

deletedAt

Supports unlimited nesting.

---

# VOTE

Stores all reactions.

Fields

id

userId

targetType

targetId

voteType

createdAt

Target Types

Experience

Comment

LocalUpdate

Vote Types

Helpful

Not Helpful

Still True

No Longer True

---

# USER

Fields

id

displayName

username

email

avatar

country

currentCityId

bio

reputationScore

premiumStatus

role

travelProfileId

createdAt

updatedAt

Roles

Guest

Traveler

Premium

Local Guide

Admin

---

# TRAVEL PROFILE

Persistent AI memory.

One profile per user.

Fields

id

userId

budgetPreference

travelStyle

foodPreference

interests[]

preferredPace

preferredTransport

nightlifePreference

adventureLevel

vegetarian

accessibilityNeeds

createdAt

updatedAt

Used by

AASPAAS AI

---

# COLLECTION

Curated list of places.

Fields

id

creatorId

title

description

coverImage

visibility

generatedByAI

saveCount

createdAt

updatedAt

---

# COLLECTION PLACE

Join table.

Fields

collectionId

placeId

displayOrder

---

# JOURNEY

Saved AI itinerary.

Fields

id

userId

title

cityId

budget

days

preferences

generatedByAI

createdAt

updatedAt

---

# JOURNEY DAY

Fields

id

journeyId

dayNumber

summary

---

# JOURNEY ITEM

Fields

id

journeyDayId

placeId

startTime

endTime

estimatedCost

reason

displayOrder

---

# TAG

Master tag list.

Examples

Photography

Nature

Street Food

Quiet

Hidden Gem

Budget

Digital Nomad

Cafe

Adventure

Family

---

# PLACE TAG

Many-to-many.

Fields

placeId

tagId

confidence

source

Sources

AI

Community

Admin

---

# AI SUMMARY

Generated summaries.

Fields

id

targetType

targetId

summary

generatedAt

version

Target Types

Place

Collection

City

Experience

---

# EMBEDDING

Vector store metadata.

Actual vector stored using pgvector.

Fields

id

targetType

targetId

embedding

model

createdAt

Target Types

Experience

Place

LocalUpdate

Collection

AI Summary

---

# NOTIFICATION

Fields

id

userId

type

payload

read

createdAt

---

# REPORT

Moderation.

Fields

id

reporterId

targetType

targetId

reason

status

createdAt

---

# BADGE

Fields

id

name

description

icon

criteria

---

# USER BADGE

Fields

userId

badgeId

earnedAt

---

# PLACE METRICS

Aggregated values.

Fields

placeId

experienceCount

localUpdateCount

visitorCount

livingScore

communityScore

lastUpdated

Updated by background jobs.

---

# CITY PULSE

Generated periodically.

Fields

cityId

summary

weatherSummary

trendingPlaces

trendingTags

warnings

generatedAt

Generated every 5–10 minutes.

---

# SEARCH HISTORY

Fields

id

userId

query

cityId

createdAt

---

# BOOKMARK

Fields

id

userId

targetType

targetId

createdAt

Target Types

Place

Experience

Collection

Journey

---

# File Storage

Images are stored in Cloudflare R2.

Database stores only URLs.

---

# Soft Delete

Experience

Comment

Collection

Journey

Use

deletedAt

instead of hard deletion.

---

# Index Strategy

Create indexes for

* cityId
* placeId
* userId
* createdAt
* expiresAt
* slug
* category
* targetType + targetId
* pgvector embedding
* latitude + longitude (PostGIS in future)

---

# Future Tables (Not MVP)

Business

BusinessClaim

Meetups

Achievements

TravelBuddy

OfflineDownloads

ARContent

These should not be implemented in Version 1.

---

# Database Rules

1. Every Experience belongs to exactly one Place.
2. Every Local Update belongs to exactly one Place.
3. Every Journey belongs to one User.
4. Every Collection contains Places only.
5. AI never stores generated text inside Experience.
6. Embeddings are always generated asynchronously.
7. Soft delete instead of hard delete wherever possible.
8. Never duplicate Place information across tables.
9. User preferences are stored only in Travel Profile.
10. Place is the heart of the data model.

# UPDATE docs/05_DATABASE_SCHEMA.md

## Add Device Support

---

# DEVICE

Stores registered mobile devices.

Fields

id

userId

platform

deviceToken

expoPushToken

lastSeenAt

createdAt

Purpose

Push notifications

Session management

Device tracking

Future multi-device support

---

# USER

Additional Fields

preferredLanguage

preferredCurrency

lastKnownCityId

lastActiveAt

These improve AI personalization on mobile.

---

# JOURNEY

Additional Fields

downloadedOffline

lastOpened

This supports offline access in future releases.

---

# LOCAL UPDATE

Additional Fields

visibilityRadius

Default

City

Future

Neighborhood

Nearby

This allows more granular Local Updates later without changing the schema.

---

# DATABASE PRINCIPLE

The database must remain platform-independent.

It should support

* Mobile App
* Future Admin Panel
* Future Website

without structural changes.
