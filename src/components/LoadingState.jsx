export default function LoadingState({ message = 'Loading weather data...' }) {
  return (
    <div className="state-box" role="status" aria-live="polite">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}
