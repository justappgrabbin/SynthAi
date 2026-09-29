// Adapted from JaneaSystems/nodejs-mobile-samples/android/native-gradle-node-folder.
#include <jni.h>
#include <node.h>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>

extern "C" JNIEXPORT jint JNICALL
Java_org_synthai_computer_MainActivity_startNode(JNIEnv *env, jobject, jobjectArray arguments) {
    const jsize count = env->GetArrayLength(arguments);
    std::vector<std::string> values;
    values.reserve(count);
    size_t bytes = 0;
    for (jsize i = 0; i < count; ++i) {
        auto arg = static_cast<jstring>(env->GetObjectArrayElement(arguments, i));
        const char *value = env->GetStringUTFChars(arg, nullptr);
        values.emplace_back(value);
        bytes += values.back().size() + 1;
        env->ReleaseStringUTFChars(arg, value);
        env->DeleteLocalRef(arg);
    }
    std::vector<char> storage(bytes);
    std::vector<char *> argv(count);
    char *cursor = storage.data();
    for (jsize i = 0; i < count; ++i) {
        std::memcpy(cursor, values[i].c_str(), values[i].size() + 1);
        argv[i] = cursor;
        cursor += values[i].size() + 1;
    }
    return node::Start(count, argv.data());
}
