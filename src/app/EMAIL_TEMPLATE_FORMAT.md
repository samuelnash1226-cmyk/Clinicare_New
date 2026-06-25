# Updated EmailJS Template Format

## Template Variables

When setting up your EmailJS template (template_sk6tt9j), use the following format:

```
Subject: {{subject}}

Dear {{to_name}},

Your child {{student_name}} ({{grade}}) visited the clinic.

**Symptoms:** {{symptoms}}

**Treatment:** {{treatment}}

**Date/Time:** {{visit_date}}

**Nurse:** {{nurse_name}}

**Nurse's Notes:** {{nurse_notes}}

**In need to be fetched:** {{pickup_required}}

Best regards,
SRB ClinicCare System
```

## Variables Explanation

- `{{subject}}` - Automatically set based on urgency (URGENT if pickup required)
- `{{to_name}}` - Parent's name
- `{{to_email}}` - Parent's email address  
- `{{student_name}}` - Student's full name
- `{{grade}}` - Student's grade level
- `{{symptoms}}` - Symptoms reported
- `{{treatment}}` - Treatment provided
- `{{visit_date}}` - Date and time of visit
- `{{nurse_name}}` - Nurse who logged the visit
- `{{nurse_notes}}` - Additional notes from the nurse (displays "None" if empty)
- `{{pickup_required}}` - Shows "YES - Please pick up your child immediately" or "No"

## Important Notes

1. All variables are automatically populated by the system
2. The `{{pickup_required}}` field clearly indicates if immediate pickup is needed
3. Nurse notes are now included in all email notifications
4. The subject line is automatically set to "URGENT" when pickup is required
