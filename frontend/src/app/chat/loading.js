export default function ChatLoading() {
  return (
    <div className="app-flow-page modality-page" aria-busy="true" aria-live="polite">
      <div className="app-flow-skeleton app-flow-skeleton--nav" />
      <div className="app-flow-skeleton app-flow-skeleton--title" />
      <div className="app-flow-skeleton app-flow-skeleton--block" />
      <div className="app-flow-skeleton app-flow-skeleton--panel" />
    </div>
  );
}
