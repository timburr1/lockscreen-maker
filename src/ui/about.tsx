import { BACKGROUNDS_BUNDLED } from '../data/backgrounds';
import { CREDITS } from '../data/credits';

export function About() {
  const credited = BACKGROUNDS_BUNDLED.flatMap((background) => {
    const credit = CREDITS.get(background.fileName);
    return credit === undefined ? [] : [{ background, credit }];
  });

  return (
    <section className="about" aria-labelledby="about-heading">
      <h2 id="about-heading">About</h2>
      <p>Everything happens in your browser. Your text and images are never uploaded, saved, or sent anywhere.</p>
      {credited.length > 0 && (
        <>
          <h3>Image credits</h3>
          <ul>
            {credited.map(({ background, credit }) => (
              <li key={background.id}>
                {background.name}: {credit.credit}, {credit.license}
                {credit.sourceUrl !== undefined && (
                  <>
                    {' '}
                    (
                    <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
                      source
                    </a>
                    )
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
