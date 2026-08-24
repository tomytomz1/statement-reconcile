/**
 * JSON-LD script tag.
 *
 * The payload is serialized with `<` escaped so a value containing `</script>` cannot break
 * out of the tag. All of the values that reach here come from our own content files rather
 * than from user input, but the escape costs nothing and removes the category of bug
 * entirely.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
