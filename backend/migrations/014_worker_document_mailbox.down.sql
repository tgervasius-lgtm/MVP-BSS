-- Migration runner uses a transaction. The owner must see every tenant's rows;
-- refusal rolls this ALTER back and restores FORCE RLS.
ALTER TABLE worker_documents NO FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM worker_documents) THEN
    RAISE EXCEPTION 'Document mailbox contains evidence; disable the feature and retain schema, encrypted documents and keys';
  END IF;
END $$;
DROP TABLE worker_documents;
DROP FUNCTION bss_document_access(uuid,text,boolean);
DROP FUNCTION bss_protect_worker_document();
