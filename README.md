# Participant Import Builder

A web tool that turns a minimal participant list (First Name, Last Name, Email) into a complete, system-ready import file by applying an event/race/ticket-specific import template.

## Problem
Our platform supports participant imports with dozens of fields (some required, some optional). Most clients only collect:
- First Name
- Last Name
- Email Address

Manually creating full import files is error-prone and slow.

## Solution Overview
Participant Import Builder lets a user:
1. Upload a simple CSV containing First Name, Last Name, Email
2. Select an Event / Race / Ticket template
3. Fill in missing fields required by that template (once)
4. Click **Process** to generate a complete import CSV where:
   - Uploaded participant fields are preserved per-row
   - User-entered fields are duplicated across every row
   - Required fields are validated before export

Admins manage templates in a gated admin portal.

---

## Core User Flow

### 1) Upload Roster
User uploads a `.csv` with at minimum:
- First Name
- Last Name
- Email

The tool will:
- Parse headers
- Auto-map common variations (e.g., "First name" -> "First Name")
- Prompt user to confirm mapping if needed

### 2) Choose Template (Event / Race / Ticket)
User selects from templates published by admins.

Template determines:
- Required columns
- Optional columns
- Input types (text/date/select/etc.)
- Allowed values / validation rules

### 3) Complete Missing Fields
User sees a form generated from template metadata:
- Required fields highlighted and must be completed
- Optional fields available to set defaults
- Some fields may have dropdowns with allowed values

### 4) Process + Export
On Process:
- Validate: required fields exist + pass rules
- Build output rows:
  - Row-specific fields from uploaded roster
  - Default fields duplicated across rows
- Generate downloadable CSV in exact template column order

---

## Admin Portal (Gated)

Admins can:
- Create a Template with a display name:
  - Event Name
  - Race Name
  - Ticket Name
- Upload template definition (CSV or JSON schema)
- Mark template as Active/Inactive
- Version templates (recommended)

### Template Formats

#### Option A: Template CSV (simple)
A CSV describing the output columns + metadata.

Example `template.csv`:

| column_name | required | input_type | allowed_values | default_value | notes |
|------------|----------|------------|----------------|---------------|------|
| first_name | true     | mapped     |                |               | from upload |
| last_name  | true     | mapped     |                |               | from upload |
| email      | true     | mapped     |                |               | from upload |
| ticket_id  | true     | select     | 123,456        |               | required |
| country    | false    | text       |                | US            | optional |

Rules:
- `input_type = mapped` means "must come from uploaded roster mapping"
- Other fields are collected via form (or defaulted)

#### Option B: Template JSON (powerful)
Recommended for validation + UI.

```json
{
  "name": "Run Ottawa 2026 / Weekend 5K / Adult",
  "version": "1.0.0",
  "fields": [
    { "key": "first_name", "label": "First Name", "required": true, "source": "upload" },
    { "key": "last_name", "label": "Last Name", "required": true, "source": "upload" },
    { "key": "email", "label": "Email", "required": true, "source": "upload", "validators": ["email"] },
    { "key": "ticket_id", "label": "Ticket", "required": true, "source": "user", "type": "select", "options": ["123","456"] },
    { "key": "country", "label": "Country", "required": false, "source": "user", "type": "text", "default": "US" }
  ],
  "output": {
    "format": "csv",
    "columnOrder": ["first_name","last_name","email","ticket_id","country"]
  }
}
```
