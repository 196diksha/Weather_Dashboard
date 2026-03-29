export default function ErrorState({ message, onRetry }) {
  return (
    <div className="state-box error" role="alert">
      <p>{message || 'Something went wrong while loading weather data.'}</p>
      {onRetry ? (
        <button className="btn-primary" type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
