import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import styles from '../styles/Camera.module.css';

const Camera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunks = useRef([]);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoURL, setVideoURL] = useState(null);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        console.log('✅ All models loaded');
      } catch (err) {
        console.error('❌ Model loading failed:', err);
      }
    };

    loadModels();
    startVideo();

    const saved = localStorage.getItem('video');
    if (saved) {
      setVideoURL(saved);
    }
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('❌ Webcam error:', err);
      });
  };

  const handlePlay = () => {
    if (!modelsLoaded || !videoRef.current) return;

    const video = videoRef.current;

    if (video.readyState !== 4) {
      video.addEventListener('loadeddata', runDetection, { once: true });
    } else {
      runDetection();
    }
  };

  const runDetection = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const displaySize = {
      width: video.videoWidth,
      height: video.videoHeight,
    };

    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceExpressions();

      const resized = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceLandmarks(canvas, resized);

      resized.forEach(detection => {
        const { expressions, detection: box } = detection;
        const highest = Object.entries(expressions).reduce((a, b) =>
          a[1] > b[1] ? a : b
        );
        ctx.font = '16px Arial';
        ctx.fillStyle = '#00FF00';
        ctx.fillText(highest[0], box.box.x, box.box.y - 10);
      });
    }, 100);
  };

  const startRecording = () => {
    const videoElement = videoRef.current;

    if (!videoElement || !videoElement.srcObject) {
      console.error("🎥 Webcam stream not ready!");
      return;
    }

    const stream = videoElement.srcObject;

    try {
      mediaRecorderRef.current = new MediaRecorder(stream);
    } catch (err) {
      console.error("❌ Failed to create MediaRecorder:", err);
      return;
    }

    chunks.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunks.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoURL(url);
      localStorage.setItem('video', url);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const deleteVideo = () => {
    localStorage.removeItem('video');
    setVideoURL(null);
  };

  if (!modelsLoaded) {
    return <p style={{ textAlign: 'center' }}>Loading face models, please wait...</p>;
  }

  return (
    <div className={styles.container}>
      <video
        ref={videoRef}
        autoPlay
        muted
        onPlay={handlePlay}
        className={styles.video}
      />
      <canvas ref={canvasRef} className={styles.canvas} />

      <div className={styles.controls}>
        {!recording ? (
          <button onClick={startRecording} className={styles.button}>
            Start Recording
          </button>
        ) : (
          <button onClick={stopRecording} className={styles.button}>
            Stop Recording
          </button>
        )}
      </div>

      {videoURL && (
        <div className={styles.videoSection}>
          <video
            src={videoURL}
            controls
            className={styles.recordedVideo}
          ></video>
          <div className={styles.buttonGroup}>
            <a
              href={videoURL}
              download="recorded-video.webm"
              className={styles.downloadButton}
            >
              Download Video
            </a>
            <button
              onClick={deleteVideo}
              className={styles.deleteButton}
            >
              Delete Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Camera;
