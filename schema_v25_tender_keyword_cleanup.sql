-- v25: 指定網址專案結果整理
-- 將沒有命中任何自訂關鍵字的既有結果標為已排除，避免混在可追蹤清單。

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'tender_results'
      and column_name = 'relevance_level'
  ) then
    update tender_results
    set
      status = '已排除',
      relevance_level = '低相關',
      relevance_score = least(relevance_score, 0),
      relevance_reasons = array_append(coalesce(relevance_reasons, '{}'), '未命中自訂關鍵字，自動移至已排除'),
      updated_at = now()
    where coalesce(array_length(matched_keywords, 1), 0) = 0;
  else
    update tender_results
    set
      status = '已排除',
      updated_at = now()
    where coalesce(array_length(matched_keywords, 1), 0) = 0;
  end if;
end $$;
