// 渲染一段 schema.org JSON-LD <script>。server 组件，零客户端开销。
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
