import Head from 'next/head';
import Camera from '../components/Camera';

export default function Home() {
  return (
    <>
      <Head>
        <title>Face Tracking App</title>
      </Head>
      <main>
        <h1 style={{ textAlign: 'center', margin: '20px 0' }}>
          Face Tracking with Video Recording
        </h1>
        <Camera />
      </main>
    </>
  );
}
