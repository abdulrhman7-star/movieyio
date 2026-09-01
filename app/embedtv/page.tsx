import { redirect } from 'next/navigation';

export default async function EmbedTvPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.searchParams;
  const searchStr = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (typeof v === 'string') {
      searchStr.set(k, v);
    } else if (Array.isArray(v) && v.length > 0) {
      searchStr.set(k, v[0]);
    }
  });

  redirect(`/embed?${searchStr.toString()}`);
}
