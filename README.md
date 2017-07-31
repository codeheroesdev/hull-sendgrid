# Hull + Sendgrid


## API integration

https://sendgrid.com/docs/API_Reference/Web_API_v3/Marketing_Campaigns/contactdb.html

- lists
  - GET https://api.sendgrid.com/v3/contactdb/lists HTTP/1.1
  - POST https://api.sendgrid.com/v3/contactdb/lists HTTP/1.1
  - DELETE https://api.sendgrid.com/v3/contactdb/lists/{list_id} HTTP/1.1
- custom_fields:
  - GET https://api.sendgrid.com/v3/contactdb/custom_fields HTTP/1.1
  - POST https://api.sendgrid.com/v3/contactdb/custom_fields HTTP/1.1
  - DELETE https://api.sendgrid.com/v3/contactdb/custom_fields/{custom_field_id} HTTP/1.1
  - GET https://api.sendgrid.com/v3/contactdb/reserved_fields HTTP/1.1
- recipients
  - GET https://api.sendgrid.com/v3/contactdb/recipients?page_size=100&page=1 
  - POST https://api.sendgrid.com/v3/contactdb/recipients HTTP/1.1

