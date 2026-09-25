package off.iglitch.autorewarder;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Canvas;
import android.graphics.ImageFormat;
import android.graphics.Paint;
import android.graphics.RectF;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.media.Image;
import android.media.ImageReader;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.SystemClock;
import android.util.Size;
import android.view.Gravity;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.PlanarYUVLuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.common.GlobalHistogramBinarizer;
import com.google.zxing.common.HybridBinarizer;

import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;

public class QrScanActivity extends Activity implements SurfaceHolder.Callback {
    public static final String EXTRA_TEXT = "qr_text";
    public static final String EXTRA_ERROR = "qr_error";

    private final MultiFormatReader reader = new MultiFormatReader();
    private CameraDevice camera;
    private CameraCaptureSession session;
    private ImageReader imageReader;
    private HandlerThread camThread;
    private Handler camHandler;
    private SurfaceView preview;
    private TextView hint;
    private volatile boolean done = false;
    private volatile boolean opening = false;
    private Size previewSize;
    private String cameraId;
    private byte[] yReuse;
    private long lastDecodeMs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
        hints.put(DecodeHintType.POSSIBLE_FORMATS, Collections.singletonList(BarcodeFormat.QR_CODE));
        hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
        try {
            hints.put(DecodeHintType.ALSO_INVERTED, Boolean.TRUE);
        } catch (Throwable ignored) {}
        reader.setHints(hints);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF0B0D12);

        preview = new AspectSurfaceView(this);
        preview.getHolder().addCallback(this);
        FrameLayout.LayoutParams previewLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT);
        previewLp.gravity = Gravity.CENTER;
        root.addView(preview, previewLp);

        root.addView(new ViewfinderOverlay(this), new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        hint = new TextView(this);
        hint.setText("Apunta al QR de AutoRewarder en el PC\n\n"
                + "1. Abre AutoRewarder en el PC.\n"
                + "2. Ve a Account > Vincular un celular.\n"
                + "3. Deja visible el QR en la pantalla.\n"
                + "4. Centra el QR dentro del cuadro y espera a que se vincule.");
        hint.setTextColor(0xFFFFFFFF);
        hint.setTextSize(14);
        hint.setLineSpacing(2, 1.0f);
        hint.setPadding(28, 24, 28, 28);
        hint.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams hintLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT);
        hintLp.gravity = Gravity.BOTTOM;
        hintLp.bottomMargin = 36;
        root.addView(hint, hintLp);

        TextView cancel = new TextView(this);
        cancel.setText("Cancelar");
        cancel.setTextColor(0xFF5B8EFF);
        cancel.setTextSize(16);
        cancel.setPadding(28, 48, 28, 24);
        cancel.setOnClickListener(v -> finishCanceled("Cámara cerrada. Escribe el código o vuelve a escanear."));
        FrameLayout.LayoutParams cancelLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT);
        cancelLp.gravity = Gravity.TOP | Gravity.END;
        root.addView(cancel, cancelLp);

        setContentView(root);
        startThread();
    }

    @Override
    public void surfaceCreated(SurfaceHolder holder) {
        openCamera();
    }

    @Override
    public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {}

    @Override
    public void surfaceDestroyed(SurfaceHolder holder) {
        closeCamera();
    }

    private void startThread() {
        camThread = new HandlerThread("qr-cam");
        camThread.start();
        camHandler = new Handler(camThread.getLooper());
    }

    private void openCamera() {
        if (done || opening) return;
        opening = true;
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            fail("Sin permiso de cámara.");
            return;
        }
        try {
            CameraManager manager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
            cameraId = pickBackCamera(manager);
            if (cameraId == null) {
                fail("Este celular no tiene cámara trasera.");
                return;
            }
            CameraCharacteristics chars = manager.getCameraCharacteristics(cameraId);
            Size[] sizes = chars.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
                    .getOutputSizes(ImageFormat.YUV_420_888);
            previewSize = pickSize(sizes);
            if (preview instanceof AspectSurfaceView) {
                ((AspectSurfaceView) preview).setAspectRatio(
                        previewSize.getWidth(), previewSize.getHeight());
            }
            imageReader = ImageReader.newInstance(
                    previewSize.getWidth(), previewSize.getHeight(), ImageFormat.YUV_420_888, 2);
            imageReader.setOnImageAvailableListener(this::onImage, camHandler);
            manager.openCamera(cameraId, new CameraDevice.StateCallback() {
                @Override
                public void onOpened(CameraDevice device) {
                    camera = device;
                    startSession();
                }

                @Override
                public void onDisconnected(CameraDevice device) {
                    closeCamera();
                }

                @Override
                public void onError(CameraDevice device, int error) {
                    fail("No se pudo abrir la cámara (" + error + ").");
                }
            }, camHandler);
        } catch (SecurityException e) {
            fail("Sin permiso de cámara.");
        } catch (Exception e) {
            fail("No se pudo abrir la cámara.");
        }
    }

    private void startSession() {
        if (camera == null || imageReader == null || preview == null) return;
        Surface previewSurface = preview.getHolder().getSurface();
        if (previewSurface == null || !previewSurface.isValid()) {
            fail("La vista de cámara no está lista.");
            return;
        }
        try {
            final CaptureRequest.Builder builder = camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
            builder.addTarget(previewSurface);
            builder.addTarget(imageReader.getSurface());
            builder.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
            builder.set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON);
            camera.createCaptureSession(
                    Arrays.asList(previewSurface, imageReader.getSurface()),
                    new CameraCaptureSession.StateCallback() {
                        @Override
                        public void onConfigured(CameraCaptureSession sess) {
                            session = sess;
                            try {
                                sess.setRepeatingRequest(builder.build(), null, camHandler);
                                runOnUiThread(() -> hint.setText("Apunta al QR de AutoRewarder en el PC\n\n"
                                        + "1. Abre AutoRewarder en el PC.\n"
                                        + "2. Ve a Account > Vincular un celular.\n"
                                        + "3. Deja visible el QR en la pantalla.\n"
                                        + "4. Centra el QR dentro del cuadro y espera a que se vincule."));
                            } catch (CameraAccessException e) {
                                fail("La cámara se detuvo.");
                            }
                        }

                        @Override
                        public void onConfigureFailed(CameraCaptureSession sess) {
                            fail("No se pudo iniciar la vista de cámara.");
                        }
                    },
                    camHandler);
        } catch (Exception e) {
            fail("No se pudo iniciar la vista de cámara.");
        }
    }

    private void onImage(ImageReader reader) {
        if (done) {
            Image dump = reader.acquireLatestImage();
            if (dump != null) dump.close();
            return;
        }
        Image image = reader.acquireLatestImage();
        if (image == null) return;
        long now = SystemClock.uptimeMillis();
        if (now - lastDecodeMs < 140) {
            image.close();
            return;
        }
        lastDecodeMs = now;
        try {
            Result result = decode(image);
            if (result != null && result.getText() != null && !result.getText().isEmpty()) {
                done = true;
                Intent out = new Intent();
                out.putExtra(EXTRA_TEXT, result.getText());
                setResult(RESULT_OK, out);
                finish();
            }
        } catch (Exception ignored) {
            this.reader.reset();
        } finally {
            image.close();
        }
    }

    private Result decode(Image image) {
        Image.Plane[] planes = image.getPlanes();
        if (planes == null || planes.length == 0) return null;
        int width = image.getWidth();
        int height = image.getHeight();
        byte[] y = copyY(planes[0], width, height);
        if (y == null) return null;
        Result r = decodeY(y, width, height);
        if (r != null) return r;
        byte[] rotated = rotateY90(y, width, height);
        r = decodeY(rotated, height, width);
        if (r != null) return r;
        byte[] rot180 = rotateY90(rotated, height, width);
        r = decodeY(rot180, width, height);
        if (r != null) return r;
        byte[] rot270 = rotateY90(rot180, width, height);
        return decodeY(rot270, height, width);
    }

    private Result decodeY(byte[] y, int width, int height) {
        try {
            PlanarYUVLuminanceSource source = new PlanarYUVLuminanceSource(
                    y, width, height, 0, 0, width, height, false);
            BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(source));
            try {
                return reader.decodeWithState(bitmap);
            } catch (Exception ignored) {
                reader.reset();
                return reader.decodeWithState(new BinaryBitmap(new GlobalHistogramBinarizer(source)));
            }
        } catch (Exception e) {
            reader.reset();
            return null;
        } finally {
            reader.reset();
        }
    }

    private byte[] copyY(Image.Plane plane, int width, int height) {
        ByteBuffer buf = plane.getBuffer();
        int rowStride = plane.getRowStride();
        int pixelStride = plane.getPixelStride();
        int needed = width * height;
        if (yReuse == null || yReuse.length != needed) yReuse = new byte[needed];
        buf.rewind();
        if (pixelStride == 1 && rowStride == width) {
            int n = Math.min(buf.remaining(), needed);
            buf.get(yReuse, 0, n);
            return yReuse;
        }
        for (int row = 0; row < height; row++) {
            int rowStart = row * rowStride;
            for (int col = 0; col < width; col++) {
                yReuse[row * width + col] = buf.get(rowStart + col * pixelStride);
            }
        }
        return yReuse;
    }

    private static byte[] rotateY90(byte[] y, int width, int height) {
        byte[] out = new byte[y.length];
        int i = 0;
        for (int x = 0; x < width; x++) {
            for (int row = height - 1; row >= 0; row--) {
                out[i++] = y[row * width + x];
            }
        }
        return out;
    }

    private static String pickBackCamera(CameraManager manager) throws CameraAccessException {
        String fallback = null;
        for (String id : manager.getCameraIdList()) {
            CameraCharacteristics c = manager.getCameraCharacteristics(id);
            Integer facing = c.get(CameraCharacteristics.LENS_FACING);
            if (facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) return id;
            if (fallback == null) fallback = id;
        }
        return fallback;
    }

    private static Size pickSize(Size[] sizes) {
        if (sizes == null || sizes.length == 0) return new Size(1280, 720);
        Size best = sizes[0];
        int bestScore = Integer.MAX_VALUE;
        int target = 1280 * 720;
        for (Size s : sizes) {
            int pixels = s.getWidth() * s.getHeight();
            int score = Math.abs(pixels - target);
            if (pixels >= 640 * 480 && pixels <= 1920 * 1080 && score < bestScore) {
                best = s;
                bestScore = score;
            }
        }
        return best;
    }

    /** Keeps the preview proportional and center-crops it on portrait screens. */
    private static class AspectSurfaceView extends SurfaceView {
        private float aspect = 16f / 9f;

        AspectSurfaceView(Context context) {
            super(context);
        }

        void setAspectRatio(int width, int height) {
            if (width > 0 && height > 0) {
                aspect = (float) width / (float) height;
                requestLayout();
            }
        }

        @Override
        protected void onMeasure(int widthSpec, int heightSpec) {
            int maxWidth = MeasureSpec.getSize(widthSpec);
            int maxHeight = MeasureSpec.getSize(heightSpec);
            if (maxWidth <= 0 || maxHeight <= 0 || aspect <= 0f) {
                super.onMeasure(widthSpec, heightSpec);
                return;
            }
            int width;
            int height;
            if ((float) maxWidth / maxHeight < aspect) {
                height = maxHeight;
                width = Math.round(height * aspect);
            } else {
                width = maxWidth;
                height = Math.round(width / aspect);
            }
            setMeasuredDimension(width, height);
        }
    }

    private void fail(String message) {
        runOnUiThread(() -> {
            if (hint != null) hint.setText(message);
        });
        opening = false;
    }

    private void finishCanceled(String message) {
        if (done) return;
        done = true;
        Intent out = new Intent();
        out.putExtra(EXTRA_ERROR, message);
        setResult(RESULT_CANCELED, out);
        finish();
    }

    private void closeCamera() {
        try {
            if (session != null) {
                session.close();
                session = null;
            }
        } catch (Exception ignored) {}
        try {
            if (camera != null) {
                camera.close();
                camera = null;
            }
        } catch (Exception ignored) {}
        try {
            if (imageReader != null) {
                imageReader.close();
                imageReader = null;
            }
        } catch (Exception ignored) {}
        opening = false;
    }

    @Override
    protected void onPause() {
        super.onPause();
        closeCamera();
    }

    @Override
    protected void onDestroy() {
        closeCamera();
        if (camThread != null) {
            camThread.quitSafely();
            camThread = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        finishCanceled("Cámara cerrada. Escribe el código o vuelve a escanear.");
    }

    private static class ViewfinderOverlay extends View {
        private final Paint dim = new Paint();
        private final Paint line = new Paint();

        ViewfinderOverlay(Activity ctx) {
            super(ctx);
            setWillNotDraw(false);
            dim.setColor(0x990B0D12);
            line.setColor(0xFF5B8EFF);
            line.setStrokeWidth(8);
            line.setStyle(Paint.Style.STROKE);
            line.setAntiAlias(true);
        }

        @Override
        protected void onDraw(Canvas canvas) {
            int w = getWidth();
            int h = getHeight();
            int box = Math.min(w, h) * 68 / 100;
            int left = (w - box) / 2;
            int top = (h - box) * 2 / 5;
            canvas.drawRect(0, 0, w, top, dim);
            canvas.drawRect(0, top, left, top + box, dim);
            canvas.drawRect(left + box, top, w, top + box, dim);
            canvas.drawRect(0, top + box, w, h, dim);
            canvas.drawRoundRect(new RectF(left, top, left + box, top + box), 22, 22, line);
            int corner = box / 8;
            Paint tick = new Paint(line);
            tick.setStrokeWidth(10);
            tick.setStrokeCap(Paint.Cap.ROUND);
            float l = left + 10, t = top + 10, r = left + box - 10, b = top + box - 10;
            canvas.drawLine(l, t, l + corner, t, tick);
            canvas.drawLine(l, t, l, t + corner, tick);
            canvas.drawLine(r, t, r - corner, t, tick);
            canvas.drawLine(r, t, r, t + corner, tick);
            canvas.drawLine(l, b, l + corner, b, tick);
            canvas.drawLine(l, b, l, b - corner, tick);
            canvas.drawLine(r, b, r - corner, b, tick);
            canvas.drawLine(r, b, r, b - corner, tick);
        }
    }
}
