-- v16: raise marketing resource upload limit for large PPT/PDF files
update storage.buckets
set file_size_limit = 209715200
where id = 'marketing-resource-files';
