import Pagination from '@/components/common/ui/pagination';

export function PaginationBar({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  return (
    <Pagination
      className="mt-500"
      onChangePage={(page) => onPageChange(page - 1)}
      page={currentPage + 1}
      totalPages={totalPages}
    />
  );
}
