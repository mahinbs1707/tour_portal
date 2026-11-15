export function PlaceholderPage({ title }) {
  return (
    <section className="mx-auto max-w-[var(--space-max-content-width)] px-[var(--space-margin-mobile)] py-12 lg:px-[var(--space-margin-desktop)]">
      <h1 className="text-display-sm m-0">{title}</h1>
    </section>
  );
}
