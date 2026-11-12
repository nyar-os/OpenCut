//! Probe: isolate which audio input media type the MP4 sink writer accepts.

#[cfg(windows)]
fn main() {
    use std::ptr;

    use windows::Win32::Media::MediaFoundation as mf;
    use windows::core::PCWSTR;

    unsafe {
        mf::MFStartup(mf::MF_VERSION, mf::MFSTARTUP_FULL).unwrap();
    }

    let outputs: Vec<(&str, windows::core::GUID, bool)> = vec![
        ("mp3", mf::MFAudioFormat_MP3, false),
        ("flac", mf::MFAudioFormat_FLAC, false),
        ("aac", mf::MFAudioFormat_AAC, false),
    ];
    // (name, is_float, bits, blockalign, avgbytes, channel_mask?)
    let variants: Vec<(
        &str,
        u32,
        Option<u32>,
        Option<u32>,
        Option<u32>,
        Option<u32>,
    )> = vec![
        (
            "float32-mask",
            1,
            Some(32),
            Some(8),
            Some(44_100 * 8),
            Some(3),
        ),
        (
            "pcm16-mask",
            0,
            Some(16),
            Some(4),
            Some(44_100 * 4),
            Some(3),
        ),
    ];

    for (out_name, out_subtype, out_mask) in &outputs {
        for (name, is_float, bits, blockalign, avgbytes, chan_mask) in &variants {
            let label = format!("{out_name}-{name}");
            let file = std::env::temp_dir().join(format!("probe-{label}.mp4"));
            let wide: Vec<u16> = {
                use std::os::windows::ffi::OsStrExt;
                file.as_os_str()
                    .encode_wide()
                    .chain(std::iter::once(0))
                    .collect()
            };
            unsafe {
                let writer = mf::MFCreateSinkWriterFromURL(
                    PCWSTR(wide.as_ptr()),
                    None::<&mf::IMFByteStream>,
                    None::<&mf::IMFAttributes>,
                )
                .unwrap();

                let out = mf::MFCreateMediaType().unwrap();
                out.SetGUID(&mf::MF_MT_MAJOR_TYPE, &mf::MFMediaType_Audio)
                    .unwrap();
                out.SetGUID(&mf::MF_MT_SUBTYPE, out_subtype).unwrap();
                out.SetUINT32(&mf::MF_MT_AUDIO_BITS_PER_SAMPLE, 16).unwrap();
                out.SetUINT32(&mf::MF_MT_AUDIO_NUM_CHANNELS, 2).unwrap();
                out.SetUINT32(&mf::MF_MT_AUDIO_SAMPLES_PER_SECOND, 44_100)
                    .unwrap();
                if *out_subtype != mf::MFAudioFormat_FLAC {
                    out.SetUINT32(&mf::MF_MT_AUDIO_AVG_BYTES_PER_SECOND, 25_600)
                        .unwrap();
                }
                if *out_mask {
                    out.SetUINT32(&mf::MF_MT_AUDIO_CHANNEL_MASK, 3).unwrap();
                }
                let index = match writer.AddStream(&out) {
                    Ok(i) => i,
                    Err(e) => {
                        println!("FAIL AddStream: {label} -> {e}");
                        continue;
                    }
                };

                let input = mf::MFCreateMediaType().unwrap();
                input
                    .SetGUID(&mf::MF_MT_MAJOR_TYPE, &mf::MFMediaType_Audio)
                    .unwrap();
                let subtype = match *is_float {
                    1 => &mf::MFAudioFormat_Float,
                    2 => &mf::MFAudioFormat_AAC,
                    _ => &mf::MFAudioFormat_PCM,
                };
                input.SetGUID(&mf::MF_MT_SUBTYPE, subtype).unwrap();
                input.SetUINT32(&mf::MF_MT_AUDIO_NUM_CHANNELS, 2).unwrap();
                input
                    .SetUINT32(&mf::MF_MT_AUDIO_SAMPLES_PER_SECOND, 44_100)
                    .unwrap();
                if let Some(bits) = *bits {
                    input
                        .SetUINT32(&mf::MF_MT_AUDIO_BITS_PER_SAMPLE, bits)
                        .unwrap();
                }
                if let Some(align) = *blockalign {
                    input
                        .SetUINT32(&mf::MF_MT_AUDIO_BLOCK_ALIGNMENT, align)
                        .unwrap();
                }
                if let Some(avg) = *avgbytes {
                    input
                        .SetUINT32(&mf::MF_MT_AUDIO_AVG_BYTES_PER_SECOND, avg)
                        .unwrap();
                }
                if let Some(mask) = *chan_mask {
                    input
                        .SetUINT32(&mf::MF_MT_AUDIO_CHANNEL_MASK, mask)
                        .unwrap();
                }

                match writer.SetInputMediaType(index, &input, None::<&mf::IMFAttributes>) {
                    Ok(()) => println!("PASS SetInputMediaType: {label}"),
                    Err(e) => println!("FAIL SetInputMediaType: {label} -> {e}"),
                }
                let _ = writer.Finalize();
                let _ = ptr::null::<u8>();
            }
        }
    }
    unsafe {
        mf::MFShutdown().unwrap();
    }
}

#[cfg(not(windows))]
fn main() {
    println!("windows only");
}
